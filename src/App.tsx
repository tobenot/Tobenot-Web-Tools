import { Suspense, useEffect, useMemo, useState } from 'react'
import { Header } from './components/Header'
import { DomainMigrationBanner } from './components/DomainMigrationBanner'
import { Layout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CommandPalette } from './components/CommandPalette'
import { UpdatePrompt } from './components/UpdatePrompt'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { ChangelogPage } from './pages/ChangelogPage'
import { NotFound } from './pages/NotFound'
import { getRouteLocation, navigate } from './utils/hash'
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
  const [routeKey, setRouteKey] = useState(0)

  useEffect(() => {
    const onNav = () => setRouteKey((k) => k + 1)
    window.addEventListener('popstate', onNav)
    return () => window.removeEventListener('popstate', onNav)
  }, [])

  /*
   * 全局拦截站内链接点击 → 走 History API，保持 SPA 体验。
   * 只接管指向已知 SPA 路由的同源链接；纯 #锚点（如阅读器脚注）、
   * 外链、/apps/ 独立页与带 download 的链接一律交还浏览器。
   */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement | null)?.closest?.('a') as HTMLAnchorElement | null
      if (!a) return
      const href = a.getAttribute('href')
      if (!href || href.startsWith('#')) return
      if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin) return
      const path = url.pathname.replace(/^\/+|\/+$/g, '')
      if (!isKnownRoute(path)) return
      e.preventDefault()
      navigate(url.pathname + url.hash)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  /*
   * routeKey 仅用于在导航时触发重新计算，
   * 故意作为依赖项存在（getRouteLocation 读的是 window.location，非响应式）。
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const route = useMemo(() => getRouteLocation(), [routeKey])

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
      <UpdatePrompt />
      {isFullPage ? (
        <main
          className={route.path === 'markdown-reader' ? 'w-full overflow-hidden p-0 sm:p-4' : 'w-full'}
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
