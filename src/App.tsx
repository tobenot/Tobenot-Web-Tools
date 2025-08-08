import { useEffect, useMemo, useState } from 'react'
import { Header } from './components/Header'
import { Layout } from './components/Layout'
import { Changelog, ChangelogEntry } from './components/Changelog'
import { CalendarTool } from './tools/calendar/CalendarTool'
import { getHashLocation } from './utils/hash'
import { getHtmlApps, HtmlAppMeta } from './data/apps'

const globalChangelog: ChangelogEntry[] = [
  { date: '2025-08-08', title: '项目初始化', notes: ['添加首页导航与机械风主题', '实现日历工具 v0.1（支持哈希分享 `?d=YYYY-MM-DD`）', '加入通用工具模板（分享、设计、更新日志）', '配置 GitHub Pages 自动部署'] },
]

function Home() {
  const apps = getHtmlApps()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // 工具列表
  const tools = [
    {
      id: 'calendar',
      title: '日历工具',
      description: '快速查看与分享指定日期',
      emoji: '🗓️',
      version: 'v0.1',
      category: 'utility',
      href: '#calendar'
    },
    {
      id: 'changelog',
      title: '更新日志',
      description: '查看项目更新记录',
      emoji: '📝',
      version: '站点',
      category: 'info',
      href: '#changelog'
    }
  ]

  // 合并工具和应用
  const allItems = [
    ...tools,
    ...apps.map(app => ({
      id: app.slug,
      title: app.title,
      description: app.description || '独立HTML应用',
      emoji: '🧩',
      version: app.version || '',
      category: 'app',
      href: app.url || `apps/${app.slug}/`,
      tags: app.tags || []
    }))
  ]

  // 分类选项
  const categories = [
    { id: 'all', label: '全部', icon: '🔥' },
    { id: 'utility', label: '工具', icon: '⚙️' },
    { id: 'app', label: '应用', icon: '🧩' },
    { id: 'info', label: '信息', icon: '📋' }
  ]

  // 过滤项目
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
            
            {/* 搜索输入框 */}
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
            
            {/* 分类选择 */}
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
            
            {/* 统计信息 */}
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
              {/* 彩色边框装饰 */}
              <div 
                className="absolute -top-0.5 -left-0.5 w-1 h-full opacity-80 pointer-events-none"
                style={{
                  background: `linear-gradient(180deg, ${['#ff6b6b', '#f7d794', '#1dd1a1', '#54a0ff', '#5f27cd'][index % 5]}, ${['#f7d794', '#1dd1a1', '#54a0ff', '#5f27cd', '#ff6b6b'][index % 5]})`,
                  backgroundSize: '100% 300%',
                  animation: 'gradient-flow-vertical 14s linear infinite'
                }}
              />
              
              <div className="p-6 space-y-4">
                {/* 图标和版本 */}
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
                
                {/* 标题和描述 */}
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>
                
                {/* 标签 */}
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
                
                {/* 操作按钮 */}
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
        
        {/* 空状态 */}
        {filteredItems.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">没有找到匹配的项目</h3>
            <p className="text-gray-600">尝试调整搜索关键词或选择不同的分类</p>
          </div>
        )}
      </div>
      
      {/* 内联CSS动画 */}
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
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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

export default function App() {
  const [hashKey, setHashKey] = useState(0)

  useEffect(() => {
    const onHashChange = () => setHashKey((k) => k + 1)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const route = useMemo(() => getHashLocation(), [hashKey])

  return (
    <Layout>
      <Header />
      <main className="max-w-6xl mx-auto px-6 pb-16 pt-8">
        {route.path === '' && <Home />}
        {route.path === 'calendar' && <CalendarTool />}
        {route.path === 'changelog' && (
          <div className="relative bg-white border-2 border-gray-200 p-6">
            <div 
              className="absolute -top-0.5 -left-0.5 -right-0.5 h-1 opacity-70 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, #ff6b6b, #f7d794, #1dd1a1, #54a0ff, #5f27cd, #ff6b6b)',
                backgroundSize: '300% 100%',
                animation: 'gradient-flow 16s linear infinite'
              }}
            />
            <Changelog entries={globalChangelog} />
          </div>
        )}
        {route.path === 'about' && (
          <div className="relative bg-white border-2 border-gray-200 p-6 space-y-4">
            <div 
              className="absolute -top-0.5 -left-0.5 -right-0.5 h-1 opacity-70 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, #ff6b6b, #f7d794, #1dd1a1, #54a0ff, #5f27cd, #ff6b6b)',
                backgroundSize: '300% 100%',
                animation: 'gradient-flow 16s linear infinite'
              }}
            />
            <h2 className="text-xl font-bold tracking-wide text-gray-900">关于与设计</h2>
            <p className="text-gray-600">
              本站聚焦简洁实用的现代 Web 工具，采用机械风 UI 与统一模板，支持哈希直达链接，方便分享传播。
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>技术栈：React + Tailwind + Vite</li>
              <li>导航：`#` 路由，单页应用</li>
              <li>部署：GitHub Pages 自动化</li>
            </ul>
          </div>
        )}
      </main>
      
      {/* 全局样式 */}
      <style>{`
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
    </Layout>
  )
}