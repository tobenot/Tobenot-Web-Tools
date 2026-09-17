/** 假日/调休格子的展示主题。文字承担语义，颜色只做辅助。 */
export interface CellHolidayTheme {
  kind: 'off' | 'work' | 'none'
  badge: '休' | '班' | null
  title: string | null
}

export function getCellHolidayTheme(status: { name: string; isOffDay: boolean } | null): CellHolidayTheme {
  if (!status) return { kind: 'none', badge: null, title: null }
  if (status.isOffDay) {
    return {
      kind: 'off',
      badge: '休',
      title: status.name ? `${status.name} · 休息日` : '休息日',
    }
  }
  return {
    kind: 'work',
    badge: '班',
    title: status.name ? `${status.name} · 调休上班` : '调休上班',
  }
}
