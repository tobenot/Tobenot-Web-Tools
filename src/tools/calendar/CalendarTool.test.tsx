import { describe, expect, it } from 'vitest'
import { act } from 'react'

/* React 18 在 jsdom 下需要显式声明 act 环境 */
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { MonthGrid } from './CalendarTool'
import { getCellHolidayTheme } from './cellTheme'

describe('CalendarTool 格子假日主题', () => {
  it('无假日状态为普通格', () => {
    expect(getCellHolidayTheme(null)).toEqual({ kind: 'none', badge: null, title: null })
  })

  it('放假用明确的「休」徽标与完整提示', () => {
    expect(getCellHolidayTheme({ name: '国庆节', isOffDay: true })).toEqual({
      kind: 'off', badge: '休', title: '国庆节 · 休息日',
    })
  })

  it('放假但名字为空仍明确显示休息日', () => {
    expect(getCellHolidayTheme({ name: '', isOffDay: true })).toEqual({
      kind: 'off', badge: '休', title: '休息日',
    })
  })

  it('调休上班用明确的「班」徽标与完整提示', () => {
    expect(getCellHolidayTheme({ name: '国庆节调休', isOffDay: false })).toEqual({
      kind: 'work', badge: '班', title: '国庆节调休 · 调休上班',
    })
  })
})

/* ───── MonthGrid 真实渲染验证 ───── */

function mockDayInfo(lunarDayStr: string, extras: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    lunarDayStr,
    lunarMonthStr: '八月',
    jieQi: null,
    lunarFestivals: [],
    solarFestivals: [],
    holidayName: null,
    isOffDay: null,
    ganZhiYear: '',
    ganZhiMonth: '',
    ganZhiDay: '',
    shengXiao: '',
    xingZuo: '',
    ...extras,
  }
}

async function renderGrid(opts: {
  getHolidayStatus: (iso: string) => { name: string; isOffDay: boolean } | null
  todayIso?: string
}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  // 2026-09：9/15 放假、9/18 调休，其余普通日
  const dayInfos: Record<number, Record<string, unknown>> = {}
  for (let d = 1; d <= 30; d++) dayInfos[d] = mockDayInfo(d === 1 ? '八月' : `初${(d % 10) + 1}`)

  await act(async () => {
    root.render(
      <MonthGrid
        year={2026}
        month={8}
        dayInfos={dayInfos as never}
        todayIso={opts.todayIso ?? '2026-09-01'}
        selectedIso={null}
        getHolidayStatus={opts.getHolidayStatus}
        onSelect={() => {}}
      />,
    )
  })
  return { container, root }
}

/** 找某天的格子按钮（按首行日期数字匹配） */
function dayButton(container: HTMLElement, day: number): HTMLButtonElement {
  const btns = Array.from(container.querySelectorAll('button:not([disabled])')) as HTMLButtonElement[]
  const btn = btns.find((b) => b.querySelector('span > span')?.textContent?.trim() === String(day))
  expect(btn, `day ${day} button should exist`).toBeTruthy()
  return btn!
}

async function cleanup(root: { unmount: () => void }, container: HTMLElement) {
  await act(async () => root.unmount())
  container.remove()
}

describe('MonthGrid 假日/调休信息层级', () => {
  const mockHoliday = (iso: string) => {
    if (iso === '2026-09-15') return { name: '国庆节', isOffDay: true }
    if (iso === '2026-09-18') return { name: '国庆节调休', isOffDay: false }
    return null
  }

  it('放假格：弱底色 + 明确「休」徽标 + 原农历信息保留', async () => {
    const { container, root } = await renderGrid({ getHolidayStatus: mockHoliday })
    const btn = dayButton(container, 15)
    expect(btn.className).toContain('bg-rose-50/60')
    expect(btn.className).toContain('border-rose-200')
    expect(btn.className).not.toContain('border-rose-300')
    expect(btn.textContent).toContain('休')
    expect(btn.textContent).toContain('初')
    expect(btn.title).toBe('国庆节 · 休息日')
    await cleanup(root, container)
  })

  it('调休格：弱底色 + 明确「班」徽标 + 原农历信息保留', async () => {
    const { container, root } = await renderGrid({ getHolidayStatus: mockHoliday })
    const btn = dayButton(container, 18)
    expect(btn.className).toContain('bg-amber-50/60')
    expect(btn.className).toContain('border-amber-200')
    expect(btn.className).not.toContain('border-amber-300')
    expect(btn.textContent).toContain('班')
    expect(btn.textContent).toContain('初')
    expect(btn.title).toBe('国庆节调休 · 调休上班')
    await cleanup(root, container)
  })

  it('普通格：没有休/班徽标，保留农历标签', async () => {
    const { container, root } = await renderGrid({ getHolidayStatus: mockHoliday })
    const btn = dayButton(container, 20)
    expect(btn.className).not.toContain('bg-rose-50/60')
    expect(btn.className).not.toContain('bg-amber-50/60')
    expect(btn.textContent).not.toContain('休')
    expect(btn.textContent).not.toContain('班')
    expect(btn.textContent).toContain('初')
    await cleanup(root, container)
  })

  it('今天恰是假日：弱假日底色和今天高亮环同时保留', async () => {
    const { container, root } = await renderGrid({ getHolidayStatus: mockHoliday, todayIso: '2026-09-15' })
    const btn = dayButton(container, 15)
    expect(btn.className).toContain('bg-rose-50/60')
    expect(btn.className).toContain('ring-2')
    await cleanup(root, container)
  })
})
