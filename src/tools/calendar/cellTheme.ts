/** 假日/调休格子的展示主题：off=放假（实底玫红+假日名），work=调休上班（实底琥珀+「班」），none=普通日 */
export interface CellHolidayTheme {
  kind: 'off' | 'work' | 'none'
  label: string | null
}

export function getCellHolidayTheme(status: { name: string; isOffDay: boolean } | null): CellHolidayTheme {
  if (!status) return { kind: 'none', label: null }
  return status.isOffDay
    ? { kind: 'off', label: status.name || '休' }
    : { kind: 'work', label: '班' }
}
