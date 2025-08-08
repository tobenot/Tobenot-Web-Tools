import { useEffect, useMemo, useState } from 'react'
import { Header } from './components/Header'
import { Layout } from './components/Layout'
import { Changelog, ChangelogEntry } from './components/Changelog'
import { CalendarTool } from './tools/calendar/CalendarTool'
import { getHashLocation } from './utils/hash'
import { getHtmlApps } from './data/apps'

const globalChangelog: ChangelogEntry[] = [
  { date: '2025-08-08', title: '项目初始化', notes: ['添加首页导航与机械风主题', '实现日历工具 v0.1（支持哈希分享 `?d=YYYY-MM-DD`）', '加入通用工具模板（分享、设计、更新日志）', '配置 GitHub Pages 自动部署'] },
]

function Home() {
  const apps = getHtmlApps()
  return (
    <div className="space-y-6">
      <div className="mecha-panel p-6">
        <h2 className="text-xl font-semibold tracking-wide">工具导航</h2>
        <p className="text-mech-muted mt-2">选择一个工具，或分享带 `#` 的直达链接。</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <a className="mecha-item" href="#calendar">
            <div className="flex items-center gap-2">
              <span className="emoji">🗓️</span>
              <div>
                <div className="font-medium">日历工具</div>
                <div className="text-xs text-mech-muted mt-0.5">快速查看与分享指定日期</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-[3px] border border-mech-edge text-xs text-mech-muted bg-white">v0.1</span>
          </a>
          <a className="mecha-item" href="#changelog">
            <div className="flex items-center gap-2">
              <span className="emoji">📝</span>
              <div>
                <div className="font-medium">更新日志</div>
                <div className="text-xs text-mech-muted mt-0.5">查看项目更新记录</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-[3px] border border-mech-edge text-xs text-mech-muted bg-white">站点</span>
          </a>
        </div>
      </div>

      <div className="mecha-panel p-6">
        <h3 className="font-medium">独立 HTML 应用</h3>
        {apps.length === 0 ? (
          <p className="text-mech-muted mt-2">暂无应用。使用 <code>npm run new:app &lt;name&gt; -- --title "页面标题"</code> 创建。</p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {apps.map((app) => (
              <a key={app.slug} className="mecha-item" href={app.url} target="_self">
                <div className="flex items-center gap-2">
                  <span className="emoji">🧩</span>
                  <div>
                    <div className="font-medium">{app.title}</div>
                    {app.description && <div className="text-xs text-mech-muted mt-0.5 line-clamp-2">{app.description}</div>}
                  </div>
                </div>
                {app.version && (
                  <span className="px-2 py-0.5 rounded-[3px] border border-mech-edge text-xs text-mech-muted bg-white">{app.version}</span>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
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
      <main className="max-w-5xl mx-auto px-4 pb-16 pt-6">
        {route.path === '' && <Home />}
        {route.path === 'calendar' && <CalendarTool />}
        {route.path === 'changelog' && (
          <div className="mecha-panel p-6">
            <Changelog entries={globalChangelog} />
          </div>
        )}
        {route.path === 'about' && (
          <div className="mecha-panel p-6 space-y-4">
            <h2 className="text-xl font-semibold tracking-wide">关于与设计</h2>
            <p className="text-mech-muted">
              本站聚焦简洁实用的现代 Web 工具，采用机械风 UI 与统一模板，支持哈希直达链接，方便分享传播。
            </p>
            <ul className="list-disc pl-6 text-mech-muted">
              <li>技术栈：React + Tailwind + Vite</li>
              <li>导航：`#` 路由，单页应用</li>
              <li>部署：GitHub Pages 自动化</li>
            </ul>
          </div>
        )}
      </main>
    </Layout>
  )
}