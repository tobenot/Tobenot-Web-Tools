export type ToolCategory = 'image' | 'doc' | 'text' | 'codec' | 'file' | 'other'

export const toolCategories: { id: ToolCategory; label: string; icon: string }[] = [
  { id: 'image', label: '图片', icon: '🖼️' },
  { id: 'doc', label: '文档', icon: '📄' },
  { id: 'text', label: '文本', icon: '✏️' },
  { id: 'codec', label: '编码', icon: '🔢' },
  { id: 'file', label: '文件', icon: '📁' },
  { id: 'other', label: '其他', icon: '🧩' },
]

const categoryIds = new Set<string>(toolCategories.map((c) => c.id))

export function isToolCategory(value: unknown): value is ToolCategory {
  return typeof value === 'string' && categoryIds.has(value)
}

export function matchesToolQuery(
  item: { title: string; description: string; tags?: string[]; category?: ToolCategory },
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)) return true
  if (item.tags?.some((t) => t.toLowerCase().includes(q))) return true
  const label = toolCategories.find((c) => c.id === item.category)?.label ?? ''
  return label.toLowerCase().includes(q)
}

export function groupToolsByCategory<T extends { category?: ToolCategory }>(items: T[]) {
  return toolCategories
    .map((cat) => ({ ...cat, items: items.filter((i) => i.category === cat.id) }))
    .filter((g) => g.items.length > 0)
}
