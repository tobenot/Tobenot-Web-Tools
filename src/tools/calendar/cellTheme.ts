/** 假日/调休格子的展示主题：off=放假（玫红浅底+顶部色条），work=调休上班（琥珀浅底+顶部色条），none=普通日 */
export interface CellHolidayTheme {
  kind: 'off' | 'work' | 'none'
  /** 放假=假日名（供格子悬停提示）；调休/普通=null */
  name: string | null
}

export function getCellHolidayTheme(status: { name: string; isOffDay: boolean } | null): CellHolidayTheme {
  if (!status) return { kind: 'none', name: null }
  return status.isOffDay
    ? { kind: 'off', name: status.name || null }
    : { kind: 'work', name: null }
}
