import { useEffect, useMemo, useState, useCallback } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { setHash, getHashLocation } from '../../utils/hash'
import { Solar, HolidayUtil } from 'lunar-typescript'

/* ───── 基础日期工具函数 ───── */

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function getWeekday(year: number, monthIndex: number, day: number): number {
  return new Date(year, monthIndex, day).getDay() // 0 Sun - 6 Sat
}

function formatDate(y: number, m: number, d: number) {
  const mm = String(m + 1).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

function parseISODate(iso?: string): { y: number; m: number; d: number } | null {
  if (!iso) return null
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(iso)
  if (!m) return null
  const y = Number(m[1])
  const mon = Number(m[2]) - 1
  const d = Number(m[3])
  const dt = new Date(y, mon, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mon || dt.getDate() !== d) return null
  return { y, m: mon, d }
}

/* ───── 农历/节气/节假日信息获取 ───── */

interface DayInfo {
  lunarDayStr: string        // 农历日（如"初一""十五"）
  lunarMonthStr: string      // 农历月（如"正月""腊月"）
  jieQi: string | null       // 节气名（如"立夏"）
  lunarFestivals: string[]   // 农历节日
  solarFestivals: string[]   // 阳历节日
  holidayName: string | null // 法定节假日名
  isOffDay: boolean | null   // true=放假 false=调休上班 null=无特殊
  ganZhiYear: string         // 年干支
  ganZhiMonth: string        // 月干支
  ganZhiDay: string          // 日干支
  shengXiao: string          // 生肖
  xingZuo: string            // 星座
}

function getDayInfo(year: number, monthIndex: number, day: number): DayInfo {
  const solar = Solar.fromYmd(year, monthIndex + 1, day)
  const lunar = solar.getLunar()

  // 节气
  const jq = lunar.getJieQi()

  // 法定假日（HolidayUtil 内置数据）
  const holiday = HolidayUtil.getHoliday(year, monthIndex + 1, day)

  return {
    lunarDayStr: lunar.getDayInChinese(),
    lunarMonthStr: (lunar.getMonth() < 0 ? '闰' : '') + lunar.getMonthInChinese() + '月',
    jieQi: jq && jq.length > 0 ? jq : null,
    lunarFestivals: lunar.getFestivals(),
    solarFestivals: solar.getFestivals(),
    holidayName: holiday ? holiday.getName() : null,
    isOffDay: holiday ? !holiday.isWork() : null,
    ganZhiYear: lunar.getYearInGanZhi(),
    ganZhiMonth: lunar.getMonthInGanZhi(),
    ganZhiDay: lunar.getDayInGanZhi(),
    shengXiao: lunar.getYearShengXiao(),
    xingZuo: solar.getXingZuo(),
  }
}

/** 获取日期格子上的简短标注文字 */
function getCellLabel(info: DayInfo): string {
  // 优先级：节气 > 农历节日 > 阳历节日 > 农历日
  if (info.jieQi) return info.jieQi
  if (info.lunarFestivals.length > 0) return info.lunarFestivals[0]
  if (info.solarFestivals.length > 0) return info.solarFestivals[0]
  // 初一显示月份名
  if (info.lunarDayStr === '初一') return info.lunarMonthStr
  return info.lunarDayStr
}

/** 获取日期格子标注的颜色样式类名 */
function getCellLabelColor(info: DayInfo): string {
  if (info.jieQi) return 'text-emerald-600'
  if (info.lunarFestivals.length > 0) return 'text-rose-500'
  if (info.solarFestivals.length > 0) return 'text-blue-500'
  return 'text-mech-muted'
}

/* ───── 节假日 API 数据缓存（增强） ───── */

interface HolidayApiEntry {
  date: string
  name: string
  isOffDay: boolean
}

type HolidayApiData = Record<string, HolidayApiEntry>

function useHolidayApi(year: number): HolidayApiData | null {
  const [data, setData] = useState<HolidayApiData | null>(null)

  useEffect(() => {
    // 先检查 localStorage 缓存
    const cacheKey = `holiday_api_${year}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        setData(JSON.parse(cached))
        return
      } catch { /* ignore */ }
    }

    // 请求 API
    const controller = new AbortController()
    fetch(`https://api.jiejiariapi.com/v1/holidays/${year}`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (json && typeof json === 'object') {
          setData(json)
          localStorage.setItem(cacheKey, JSON.stringify(json))
        }
      })
      .catch(() => { /* 网络失败时降级使用本地 HolidayUtil */ })

    return () => controller.abort()
  }, [year])

  return data
}

export function CalendarTool() {
  const now = useMemo(() => new Date(), [])
  const initial = useMemo(() => {
    const { params } = getHashLocation()
    const parsed = parseISODate(params.get('d') || undefined)
    if (parsed) return parsed
    return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() }
  }, [now])

  const [year, setYear] = useState(initial.y)
  const [month, setMonth] = useState(initial.m) // 0-11
  const [selectedDay, setSelectedDay] = useState<number | null>(initial.d)

  // 节假日 API 数据（增强本地 HolidayUtil）
  const holidayApiData = useHolidayApi(year)

  useEffect(() => {
    const onHash = () => {
      const { params, path } = getHashLocation()
      if (path !== 'calendar') return
      const parsed = parseISODate(params.get('d') || undefined)
      if (parsed) {
        setYear(parsed.y)
        setMonth(parsed.m)
        setSelectedDay(parsed.d)
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const goTo = useCallback((y: number, m: number) => {
    setYear(y)
    setMonth(m)
  }, [])

  function prevMonth() {
    const d = new Date(year, month, 1)
    d.setMonth(d.getMonth() - 1)
    goTo(d.getFullYear(), d.getMonth())
  }

  function nextMonth() {
    const d = new Date(year, month, 1)
    d.setMonth(d.getMonth() + 1)
    goTo(d.getFullYear(), d.getMonth())
  }

  function selectDay(day: number) {
    setSelectedDay(day)
    const iso = formatDate(year, month, day)
    setHash('calendar', { d: iso })
  }

  const days = getDaysInMonth(year, month)
  const firstWeekday = getWeekday(year, month, 1)
  const todayIso = formatDate(now.getFullYear(), now.getMonth(), now.getDate())

  // 预计算本月每日的农历信息
  const monthDayInfos = useMemo(() => {
    const infos: Record<number, DayInfo> = {}
    for (let d = 1; d <= getDaysInMonth(year, month); d++) {
      infos[d] = getDayInfo(year, month, d)
    }
    return infos
  }, [year, month])

  const weeks: Array<Array<{ day: number | null; iso?: string }>> = []
  let currentWeek: Array<{ day: number | null; iso?: string }> = []

  // Fill leading blanks
  for (let i = 0; i < firstWeekday; i++) currentWeek.push({ day: null })

  for (let d = 1; d <= days; d++) {
    const iso = formatDate(year, month, d)
    currentWeek.push({ day: d, iso })
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push({ day: null })
    weeks.push(currentWeek)
  }

  const isoSelected = selectedDay ? formatDate(year, month, selectedDay) : null

  // 获取选中日期的综合假日信息（API 优先，本地 HolidayUtil 兜底）
  const getHolidayStatus = useCallback((iso: string): { name: string; isOffDay: boolean } | null => {
    // 优先使用 API 数据
    if (holidayApiData && holidayApiData[iso]) {
      return { name: holidayApiData[iso].name, isOffDay: holidayApiData[iso].isOffDay }
    }
    // 兜底用本地 HolidayUtil
    const parsed = parseISODate(iso)
    if (!parsed) return null
    const h = HolidayUtil.getHoliday(parsed.y, parsed.m + 1, parsed.d)
    if (h) return { name: h.getName(), isOffDay: !h.isWork() }
    return null
  }, [holidayApiData])

  // 选中日期的详细信息
  const selectedInfo = useMemo(() => {
    if (!selectedDay || !monthDayInfos[selectedDay]) return null
    return monthDayInfos[selectedDay]
  }, [selectedDay, monthDayInfos])

  return (
    <ToolLayout
      title="日历工具"
      description="支持农历、二十四节气、传统节日与中国法定节假日/调休标记。"
      designNotes={[
        '纯哈希路由，链接可直接分享保存',
        '农历/节气基于 lunar-typescript 本地计算',
        '法定节假日通过 jiejiariapi.com API 增强',
        '机械风格面板与边框，清晰的层次对比',
      ]}
    >
      <div className="flex flex-col gap-4">
        {/* 头部导航 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 px-3 py-2 rounded-[3px] border border-mech-edge bg-white hover:bg-neutral-50 text-mech-text transition-colors" onClick={prevMonth} aria-label="上一月">←</button>
            <div className="text-lg font-medium tabular-nums tracking-wide">
              {year} 年 {month + 1} 月
            </div>
            <button className="inline-flex items-center gap-2 px-3 py-2 rounded-[3px] border border-mech-edge bg-white hover:bg-neutral-50 text-mech-text transition-colors" onClick={nextMonth} aria-label="下一月">→</button>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-[3px] border border-mech-edge bg-white hover:bg-neutral-50 text-mech-text transition-colors"
              onClick={() => {
                const d = new Date()
                setYear(d.getFullYear())
                setMonth(d.getMonth())
                setSelectedDay(d.getDate())
                setHash('calendar', { d: formatDate(d.getFullYear(), d.getMonth(), d.getDate()) })
              }}
            >今天</button>
          </div>
        </div>

        {/* 农历月份提示 */}
        {monthDayInfos[1] && (
          <div className="text-sm text-mech-muted flex items-center gap-2">
            <span>{monthDayInfos[1].ganZhiYear}年</span>
            <span>【{monthDayInfos[1].shengXiao}年】</span>
          </div>
        )}

        {/* 日历网格 */}
        <div className="grid grid-cols-7 gap-1">
          {['日','一','二','三','四','五','六'].map((w, i) => (
            <div key={w} className={`text-center text-sm py-1 ${i === 0 || i === 6 ? 'text-rose-400' : 'text-mech-muted'}`}>{w}</div>
          ))}
          {weeks.map((week, wi) => (
            <div key={wi} className="contents">
              {week.map((cell, ci) => {
                const isToday = cell.iso === todayIso
                const isSelected = cell.iso && isoSelected === cell.iso
                const info = cell.day ? monthDayInfos[cell.day] : null
                const holidayStatus = cell.iso ? getHolidayStatus(cell.iso) : null
                const isWeekend = ci === 0 || ci === 6

                // 假日标记
                const showHolidayBadge = holidayStatus !== null
                const isHolidayOff = holidayStatus?.isOffDay === true
                const isWorkDay = holidayStatus?.isOffDay === false // 调休上班

                return (
                  <button
                    key={ci}
                    disabled={!cell.day}
                    onClick={() => cell.day && selectDay(cell.day)}
                    className={
                      'relative bg-mech-panel border border-mech-edge rounded-[3px] flex flex-col items-center justify-center select-none py-1 min-h-[52px] ' +
                      (cell.day
                        ? 'hover:border-mech-accent cursor-pointer ' +
                          (isSelected ? 'border-mech-accent ring-1 ring-mech-accent/30 ' : '') +
                          (isToday ? 'bg-white ring-2 ring-blue-300/50 ' : '') +
                          (isHolidayOff ? 'bg-rose-50/50 ' : '') +
                          (isWorkDay ? 'bg-amber-50/50 ' : '')
                        : 'opacity-30 cursor-default')
                    }
                    aria-pressed={!!isSelected}
                  >
                    {/* 假日/调休角标 */}
                    {showHolidayBadge && cell.day && (
                      <span className={`absolute top-0.5 right-0.5 text-[9px] leading-none font-medium ${isHolidayOff ? 'text-rose-500' : 'text-amber-600'}`}>
                        {isHolidayOff ? '休' : '班'}
                      </span>
                    )}
                    {/* 公历日期 */}
                    <span className={`tabular-nums text-sm font-medium ${isWeekend && !isWorkDay ? 'text-rose-500' : 'text-mech-text'}`}>
                      {cell.day ?? ''}
                    </span>
                    {/* 农历/节气标注 */}
                    {info && cell.day && (
                      <span className={`text-[10px] leading-tight truncate max-w-full px-0.5 ${getCellLabelColor(info)}`}>
                        {getCellLabel(info)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* 选中日期详情 */}
        <div className="border border-mech-edge rounded-[3px] bg-mech-panel p-3 min-h-[80px]">
          {selectedInfo && isoSelected ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-mech-text font-medium">{isoSelected}</span>
                  <span className="text-sm text-mech-muted">{selectedInfo.xingZuo}座</span>
                </div>
                <a className="inline-flex items-center gap-1 px-2 py-1 rounded-[3px] border border-mech-edge bg-white hover:bg-neutral-50 text-mech-text text-xs transition-colors" href={`#calendar?d=${isoSelected}`}>
                  分享
                </a>
              </div>

              {/* 农历信息行 */}
              <div className="flex items-center gap-3 text-sm">
                <span className="text-mech-text">{selectedInfo.lunarMonthStr}{selectedInfo.lunarDayStr}</span>
                <span className="text-mech-muted">{selectedInfo.ganZhiYear}年 {selectedInfo.ganZhiMonth}月 {selectedInfo.ganZhiDay}日</span>
              </div>

              {/* 节气 */}
              {selectedInfo.jieQi && (
                <div className="flex items-center gap-1">
                  <span className="inline-block px-1.5 py-0.5 text-xs rounded bg-emerald-100 text-emerald-700 border border-emerald-200">节气</span>
                  <span className="text-sm text-emerald-700 font-medium">{selectedInfo.jieQi}</span>
                </div>
              )}

              {/* 节日 */}
              {(selectedInfo.lunarFestivals.length > 0 || selectedInfo.solarFestivals.length > 0) && (
                <div className="flex items-center gap-1 flex-wrap">
                  {selectedInfo.lunarFestivals.map((f) => (
                    <span key={f} className="inline-block px-1.5 py-0.5 text-xs rounded bg-rose-100 text-rose-700 border border-rose-200">{f}</span>
                  ))}
                  {selectedInfo.solarFestivals.map((f) => (
                    <span key={f} className="inline-block px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700 border border-blue-200">{f}</span>
                  ))}
                </div>
              )}

              {/* 法定假日信息 */}
              {(() => {
                const hs = getHolidayStatus(isoSelected)
                if (!hs) return null
                return (
                  <div className="flex items-center gap-1">
                    <span className={`inline-block px-1.5 py-0.5 text-xs rounded border ${hs.isOffDay ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                      {hs.isOffDay ? '法定假日' : '调休上班'}
                    </span>
                    <span className="text-sm text-mech-text">{hs.name}</span>
                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="text-sm text-mech-muted flex items-center justify-center h-full">
              点击日期查看农历、节气与节假日详情
            </div>
          )}
        </div>

        {/* 图例 */}
        <div className="flex items-center gap-4 text-xs text-mech-muted">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-rose-50 border border-rose-200" />休</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-amber-50 border border-amber-200" />班</span>
          <span className="flex items-center gap-1"><span className="text-emerald-600">●</span>节气</span>
          <span className="flex items-center gap-1"><span className="text-rose-500">●</span>节日</span>
        </div>
      </div>
    </ToolLayout>
  )
}