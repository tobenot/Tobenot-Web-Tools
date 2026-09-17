import { describe, expect, it } from 'vitest'
import { act } from 'react'

/* React 18 在 jsdom 下需要显式声明 act 环境 */
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { MonthGrid } from './CalendarTool'
import { getCellHolidayTheme } from './cellTheme'

describe('CalendarTool 格子假日主题', () => {
  it('无假日状态为普通格', () => {
    expect(getCellHolidayTheme(null)).toEqual({ kind: 'none', name: null })
  })

  it('放假（isOffDay=true）→ off，name 用假日名', () => {
    expect(getCellHolidayTheme({ name: '国庆节', isOffDay: true })).toEqual({ kind: 'off', name: '国庆节' })
  })

  it('放假但名字为空 → name 兜底 null', () => {
    expect(getCellHolidayTheme({ name: '', isOffDay: true })).toEqual({ kind: 'off', name: null })
  })

  it('调休上班（isOffDay=false）→ work，name 为 null', () => {
    expect(getCellHolidayTheme({ name: '国庆节调休', isOffDay: false })).toEqual({ kind: 'work', name: null })
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

/** 找某天的格子按钮（按日期数字精确匹配） */
function dayButton(container: HTMLElement, day: number): HTMLButtonElement {
  const btns = Array.from(container.querySelectorAll('button:not([disabled])')) as HTMLButtonElement[]
  const btn = btns.find((b) => b.textContent?.trim().startsWith(String(day)))
  expect(btn, `day ${day} button should exist`).toBeTruthy()
  return btn!
}

/** 渲染后清理（卸载必须包 act） */
async function cleanup(root: { unmount: () => void }, container: HTMLElement) {
  await act(async () => root.unmount())
  container.remove()
}

describe('MonthGrid 假日/调休轻量视觉区分', () => {
  const mockHoliday = (iso: string) => {
    if (iso === '2026-09-15') return { name: '国庆节', isOffDay: true }
    if (iso === '2026-09-18') return { name: '国庆节调休', isOffDay: false }
    return null
  }

  it('放假格：玫红浅底 + 边框 + 顶部色条，农历标签保留，假日名进悬停提示', async () => {
    const { container, root } = await renderGrid({ getHolidayStatus: mockHoliday })
    const btn = dayButton(container, 15)
    expect(btn.className).toContain('bg-rose-50')
    expect(btn.className).toContain('border-rose-300')
    expect(btn.className).not.toContain('bg-rose-500')
    expect(btn.querySelector('span.bg-rose-500'), 'top color bar').toBeTruthy()
    expect(btn.title).toBe('国庆节')
    expect(btn.textContent).toContain('初')
    await cleanup(root, container)
  })

  it('调休格：琥珀浅底 + 边框 + 顶部色条，农历标签保留，无假日名提示', async () => {
    const { container, root } = await renderGrid({ getHolidayStatus: mockHoliday })
    const btn = dayButton(container, 18)
    expect(btn.className).toContain('bg-amber-50')
    expect(btn.className).toContain('border-amber-300')
    expect(btn.className).not.toContain('bg-amber-500')
    expect(btn.querySelector('span.bg-amber-500'), 'top color bar').toBeTruthy()
    expect(btn.title).toBe('')
    expect(btn.textContent).toContain('初')
    await cleanup(root, container)
  })

  it('普通格：无浅底无边框无顶部色条，农历标签保留', async () => {
    const { container, root } = await renderGrid({ getHolidayStatus: mockHoliday })
    const btn = dayButton(container, 20)
    expect(btn.className).not.toContain('bg-rose-50')
    expect(btn.className).not.toContain('bg-amber-50')
    expect(btn.className).not.toContain('border-rose-300')
    expect(btn.className).not.toContain('border-amber-300')
    expect(btn.querySelector('span.bg-rose-500')).toBeNull()
    expect(btn.querySelector('span.bg-amber-500')).toBeNull()
    expect(btn.textContent).toContain('初')
    await cleanup(root, container)
  })

  it('今天恰是假日：玫红浅底保留，且有今天高亮环', async () => {
    const { container, root } = await renderGrid({ getHolidayStatus: mockHoliday, todayIso: '2026-09-15' })
    const btn = dayButton(container, 15)
    expect(btn.className).toContain('bg-rose-50')
    expect(btn.className).toContain('ring-2')
    await cleanup(root, container)
  })
})
