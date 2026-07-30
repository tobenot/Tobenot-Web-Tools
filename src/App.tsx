import { Suspense, useEffect, useMemo, useState } from 'react'
import { Header } from './components/Header'
import { DomainMigrationBanner } from './components/DomainMigrationBanner'
import { Layout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CommandPalette } from './components/CommandPalette'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { ChangelogPage } from './pages/ChangelogPage'
import { NotFound } from './pages/NotFound'
import { getHashLocation } from './utils/hash'
import { setFavicon } from './utils/favicon'
import { recordToolVisit } from './utils/recent'
import { getPageTitle, isKnownRoute, toolsById } from './data/routes'

/** 懒加载 chunk 就位前的占位，避免布局跳动 */
function ToolFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <span className="inline-block w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        <span>加载中…</span>
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

  useEffect(() => {
    document.title = getPageTitle(route.path)
    setFavicon(route.path)
    recordToolVisit(route.path)
  }, [route.path])

  const tool = toolsById[route.path]
  const ToolComponent = tool?.component
  const isFullPage = Boolean(tool?.fullPage)

  /*
   * 全屏工具自带滚动容器并隐藏页脚，因此需要独立的 <main>；
   * 其余页面共用带内边距的常规容器。
   */
  const content = ToolComponent ? (
    <ErrorBoundary key={route.path}>
      <Suspense fallback={<ToolFallback />}>
        <ToolComponent />
      </Suspense>
    </ErrorBoundary>
  ) : route.path === '' ? (
    <Home />
  ) : route.path === 'changelog' ? (
    <ChangelogPage />
  ) : route.path === 'about' ? (
    <About />
  ) : isKnownRoute(route.path) ? null : (
    <NotFound path={route.path} />
  )

  return (
    <Layout hideFooter={isFullPage}>
      <Header />
      <DomainMigrationBanner />
      <CommandPalette />
      {isFullPage ? (
        <main
          className={route.path === 'markdown-reader' ? 'w-full overflow-hidden p-4' : 'w-full'}
          style={{ height: 'calc(100vh - 66px)' }}
        >
          {content}
        </main>
      ) : (
        <main className="w-full px-6 pb-16 pt-8">{content}</main>
      )}
    </Layout>
  )
}
