import { useEffect, useMemo, useState } from 'react'
import { getHtmlApps } from '../data/apps'
import { groupToolsByCategory, matchesToolQuery, toolCategories, type ToolCategory } from '../data/catalog'
import { tools, ToolDef } from '../data/routes'
import { getRecentTools } from '../utils/recent'

export function Home() {
  const apps = useMemo(() => getHtmlApps(), [])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | ToolCategory>('all')
  /*
   * 「最近使用」需在挂载后读取：hash 变化不会重新挂载 Home，
   * 从工具页返回首页时若在渲染期同步读取 localStorage，列表不会刷新。
   */
  const [recentIds, setRecentIds] = useState<string[]>([])

  useEffect(() => {
    setRecentIds(getRecentTools())
  }, [])

  const allItems: ToolDef[] = useMemo(() => [
    ...tools.filter((t) => t.category),
    ...apps.map((app) => ({
      id: app.slug,
      title: app.title,
      description: app.description || '独立HTML应用',
      emoji: '🧩',
      version: app.version || '',
      category: app.category,
      href: app.url || `apps/${app.slug}/`,
      tags: app.tags || []
    }))
  ], [apps])

  const filteredItems = allItems.filter((item) => {
    if (!matchesToolQuery(item, searchTerm)) return false
    return selectedCategory === 'all' || item.category === selectedCategory
  })

  const groups = groupToolsByCategory(filteredItems)
  const recentItems = recentIds
    .map((id) => allItems.find((item) => item.id === id))
    .filter(Boolean) as ToolDef[]

  return (
    <div className="min-h-screen relative max-w-6xl mx-auto">
      <div
        className="fixed inset-0 opacity-[0.015] dark:opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />

      <div className="relative space-y-8 pb-16">
        {recentItems.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">最近</span>
            {recentItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-all rounded-mech"
              >
                <span>{item.emoji}</span>
                <span>{item.title}</span>
              </a>
            ))}
          </div>
        )}

        <div className="relative bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 backdrop-blur-sm">
          <div
            className="absolute -top-0.5 -left-0.5 -right-0.5 h-1 opacity-70 pointer-events-none animate-gradient-flow"
            style={{
              background: 'linear-gradient(90deg, #ff6b6b, #f7d794, #1dd1a1, #54a0ff, #5f27cd, #ff6b6b)',
              backgroundSize: '300% 100%'
            }}
          />

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🔍</div>
              <div>
                <h2 className="text-xl font-bold tracking-wide text-gray-900 dark:text-gray-100">工具中心</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">按用途浏览，或直接搜索（Ctrl+K）</p>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="搜索工具、应用... (Ctrl+K)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 px-4 pr-12 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors font-medium rounded-mech"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                🔍
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`inline-flex items-center gap-2 px-4 py-2 border-2 font-medium transition-colors rounded-mech ${
                  selectedCategory === 'all'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <span>🔥</span>
                <span>全部</span>
              </button>
              {toolCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 border-2 font-medium transition-colors rounded-mech ${
                    selectedCategory === category.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <span>{category.icon}</span>
                  <span>{category.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
              <span>找到 {filteredItems.length} 个项目</span>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  清除搜索
                </button>
              )}
            </div>
          </div>
        </div>

        {groups.map((group) => (
          <section key={group.id} className="space-y-3">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 tracking-wide flex items-center gap-2">
              <span>{group.icon}</span>
              <span>{group.label}</span>
              <span className="text-gray-400 dark:text-gray-500 font-normal">{group.items.length}</span>
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <ToolCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}

        {filteredItems.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">没有找到匹配的项目</h3>
            <p className="text-gray-600 dark:text-gray-400">尝试调整搜索关键词或选择不同的分类</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ToolCard({ item }: { item: ToolDef }) {
  const isExternal = item.href.startsWith('http://') || item.href.startsWith('https://')
  return (
    <a
      href={item.href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="group flex items-start gap-3 p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors rounded-mech"
    >
      <span className="text-2xl shrink-0">{item.emoji}</span>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
          {item.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
          {item.description}
        </p>
      </div>
      {isExternal && <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mt-1">↗</span>}
    </a>
  )
}
