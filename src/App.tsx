import { useEffect, useMemo, useState } from 'react'
import { Header } from './components/Header'
import { Layout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CommandPalette } from './components/CommandPalette'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { ChangelogPage } from './pages/ChangelogPage'
import { CalendarTool } from './tools/calendar/CalendarTool'
import { MarkdownReaderTool } from './tools/markdown-reader/MarkdownReaderTool'
import { PromptGalleryTool } from './tools/prompt-gallery/PromptGalleryTool'
import { SpaceTabConverterTool } from './tools/space-tab-converter/SpaceTabConverterTool'
import { BgRemoverTool } from './tools/bg-remover/BgRemoverTool'
import { JsonViewerTool } from './tools/json-viewer/JsonViewerTool'
import { Base64Tool } from './tools/base64/Base64Tool'
import { UrlCodecTool } from './tools/url-codec/UrlCodecTool'
import { RegexTesterTool } from './tools/regex-tester/RegexTesterTool'
import { getHashLocation } from './utils/hash'
import { setFavicon } from './utils/favicon'
import { recordToolVisit } from './utils/recent'
import { pageTitleMap } from './data/routes'

export default function App() {
  const [hashKey, setHashKey] = useState(0)

  useEffect(() => {
    const onHashChange = () => setHashKey((k) => k + 1)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const route = useMemo(() => getHashLocation(), [hashKey])

  useEffect(() => {
    document.title = pageTitleMap[route.path] ?? 'Mecha Tools | 现代机械风 Web 工具站'
    setFavicon(route.path)
    if (route.path && route.path !== 'changelog' && route.path !== 'about') {
      recordToolVisit(route.path)
    }
  }, [route.path])

  return (
    <Layout hideFooter={route.path === 'markdown-reader'}>
      <Header />
      <CommandPalette />
      {route.path === 'markdown-reader' && (
        <main className="w-full overflow-hidden p-4" style={{ height: 'calc(100vh - 66px)' }}>
          <ErrorBoundary>
            <MarkdownReaderTool />
          </ErrorBoundary>
        </main>
      )}
      <main className={`w-full px-6 pb-16 pt-8${route.path === 'markdown-reader' ? ' hidden' : ''}`}>
        {route.path === '' && <Home />}
        {route.path === 'calendar' && <ErrorBoundary><CalendarTool /></ErrorBoundary>}
        {route.path === 'prompt-gallery' && <ErrorBoundary><PromptGalleryTool /></ErrorBoundary>}
        {route.path === 'bg-remover' && <ErrorBoundary><BgRemoverTool /></ErrorBoundary>}
        {route.path === 'space-tab-converter' && <ErrorBoundary><SpaceTabConverterTool /></ErrorBoundary>}
        {route.path === 'json-viewer' && <ErrorBoundary><JsonViewerTool /></ErrorBoundary>}
        {route.path === 'base64' && <ErrorBoundary><Base64Tool /></ErrorBoundary>}
        {route.path === 'url-codec' && <ErrorBoundary><UrlCodecTool /></ErrorBoundary>}
        {route.path === 'regex-tester' && <ErrorBoundary><RegexTesterTool /></ErrorBoundary>}
        {route.path === 'changelog' && <ChangelogPage />}
        {route.path === 'about' && <About />}
      </main>

      <style>{`
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
    </Layout>
  )
}
