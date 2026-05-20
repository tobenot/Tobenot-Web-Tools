import { useState } from 'react'
import { getHtmlApps } from '../data/apps'
import { tools, ToolDef } from '../data/routes'

export function Home() {
  const apps = getHtmlApps()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const allItems: ToolDef[] = [
    ...tools,
    ...apps.map(app => ({
      id: app.slug,
      title: app.title,
      description: app.description || '独立HTML应用',
      emoji: '🧩',
      version: app.version || '',
      category: 'app' as const,
      href: app.url || `apps/${app.slug}/`,
      tags: app.tags || []
    }))
  ]

  const categories = [
    { id: 'all', label: '全部', icon: '🔥' },
    { id: 'utility', label: '工具', icon: '⚙️' },
    { id: 'app', label: '应用', icon: '🧩' },
    { id: 'info', label: '信息', icon: '📋' }
  ]

  const filteredItems = allItems.filter(item => {
    const matchesSearch = searchTerm === '' ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-white relative">
      {/* 背景网格 */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, #0f172a 1px, transparent 1px), linear-gradient(to bottom, #0f172a 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />

      <div className="relative space-y-8 pb-16">
        {/* 搜索栏和分类筛选 */}
        <div
          className="relative bg-white border-2 border-gray-200 backdrop-blur-sm"
          style={{
            borderImage: 'linear-gradient(90deg, #ff6b6b, #f7d794, #1dd1a1, #54a0ff, #5f27cd, #ff6b6b) 1',
            animation: 'none'
          }}
        >
          <div
            className="absolute -top-0.5 -left-0.5 -right-0.5 h-1 opacity-70 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, #ff6b6b, #f7d794, #1dd1a1, #54a0ff, #5f27cd, #ff6b6b)',
              backgroundSize: '300% 100%',
              animation: 'gradient-flow 12s linear infinite'
            }}
          />

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🔍</div>
              <div>
                <h2 className="text-xl font-bold tracking-wide text-gray-900">工具中心</h2>
                <p className="text-sm text-gray-600 mt-1">搜索并发现实用工具与应用</p>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="搜索工具、应用..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 px-4 pr-12 border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors font-medium"
                style={{ borderRadius: '2px' }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                🔍
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 border-2 font-medium transition-all duration-200 hover:scale-105 ${
                    selectedCategory === category.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  <span>{category.icon}</span>
                  <span>{category.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
              <span>找到 {filteredItems.length} 个项目</span>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  清除搜索
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 项目网格 */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item, index) => (
            <a
              key={item.id}
              href={item.href}
              target={item.category === 'app' ? '_self' : undefined}
              className="group relative bg-white border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              style={{
                borderRadius: '2px',
                animationDelay: `${index * 50}ms`,
                animation: 'slideInUp 0.6s ease-out both'
              }}
            >
              <div
                className="absolute -top-0.5 -left-0.5 w-1 h-full opacity-80 pointer-events-none"
                style={{
                  background: `linear-gradient(180deg, ${['#ff6b6b', '#f7d794', '#1dd1a1', '#54a0ff', '#5f27cd'][index % 5]}, ${['#f7d794', '#1dd1a1', '#54a0ff', '#5f27cd', '#ff6b6b'][index % 5]})`,
                  backgroundSize: '100% 300%',
                  animation: 'gradient-flow-vertical 14s linear infinite'
                }}
              />

              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="text-3xl group-hover:scale-110 transition-transform duration-300">
                    {item.emoji}
                  </div>
                  {item.version && (
                    <span className="px-3 py-1 border border-gray-300 text-xs font-medium text-gray-600 bg-gray-50">
                      {item.version}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 font-medium"
                        style={{ borderRadius: '2px' }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100">
                  <div className="text-sm font-medium text-blue-600 group-hover:text-blue-800 flex items-center gap-2">
                    <span>打开工具</span>
                    <span className="text-lg group-hover:translate-x-1 transition-transform duration-300">→</span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">没有找到匹配的项目</h3>
            <p className="text-gray-600">尝试调整搜索关键词或选择不同的分类</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        @keyframes gradient-flow-vertical {
          0% { background-position: 50% 0%; }
          100% { background-position: 50% 100%; }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
