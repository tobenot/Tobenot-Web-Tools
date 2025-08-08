import { useEffect, useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { setHash, getHashLocation } from '../../utils/hash'

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

  function goTo(y: number, m: number) {
    setYear(y)
    setMonth(m)
  }

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

  return (
    <ToolLayout
      title="日历工具"
      description="快速查看月份、选择日期并可通过哈希参数分享（#calendar?d=YYYY-MM-DD）。"
      designNotes={[
        '纯哈希路由，链接可直接分享保存',
        '相对资源路径适配 GitHub Pages 子路径',
        '机械风格面板与边框，清晰的层次对比',
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-mech-edge bg-white hover:bg-neutral-50 text-mech-text transition-colors" onClick={prevMonth} aria-label="上一月">←</button>
            <div className="text-lg font-medium tabular-nums tracking-wide">
              {year} 年 {month + 1} 月
            </div>
            <button className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-mech-edge bg-white hover:bg-neutral-50 text-mech-text transition-colors" onClick={nextMonth} aria-label="下一月">→</button>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-mech-edge bg-white hover:bg-neutral-50 text-mech-text transition-colors"
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

        <div className="grid grid-cols-7 gap-2">
          {['日','一','二','三','四','五','六'].map((w) => (
            <div key={w} className="text-center text-sm text-mech-muted">{w}</div>
          ))}
          {weeks.map((week, wi) => (
            <div key={wi} className="contents">
              {week.map((cell, ci) => {
                const isToday = cell.iso === todayIso
                const isSelected = cell.iso && isoSelected === cell.iso
                return (
                  <button
                    key={ci}
                    disabled={!cell.day}
                    onClick={() => cell.day && selectDay(cell.day)}
                    className={
                      'aspect-square bg-mech-panel border border-mech-edge rounded-xl shadow-subtle flex items-center justify-center select-none ' +
                      (cell.day
                        ? 'hover:border-mech-accent ' +
                          (isSelected ? 'border-mech-accent ring-1 ring-mech-accent/30 ' : '') +
                          (isToday ? 'bg-white' : '')
                        : 'opacity-30 cursor-default')
                    }
                    aria-pressed={isSelected}
                  >
                    <span className="tabular-nums text-sm">{cell.day ?? ''}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-mech-muted">
            {isoSelected ? (
              <>
                已选择：<span className="text-mech-text font-medium">{isoSelected}</span>
              </>
            ) : (
              '未选择日期'
            )}
          </div>
          {isoSelected && (
            <a className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-mech-edge bg-white hover:bg-neutral-50 text-mech-text transition-colors" href={`#calendar?d=${isoSelected}`}>
              分享此日期
            </a>
          )}
        </div>
      </div>
    </ToolLayout>
  )
}