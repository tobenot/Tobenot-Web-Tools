import { useEffect, useRef, useState } from 'react'
import { tools } from '../data/routes'
import { getHtmlApps } from '../data/apps'

interface SearchItem {
  id: string
  title: string
  description: string
  emoji: string
  href: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const allItems: SearchItem[] = (() => {
    const apps = getHtmlApps()
    return [
      ...tools.map(t => ({ id: t.id, title: t.title, description: t.description, emoji: t.emoji, href: t.href })),
      ...apps.map(a => ({ id: a.slug, title: a.title, description: a.description || '', emoji: '🧩', href: a.url || `apps/${a.slug}/` }))
    ]
  })()

  const filtered = query === ''
    ? allItems
    : allItems.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
      )

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.children[selectedIndex] as HTMLElement
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  function navigate(href: string) {
    setOpen(false)
    if (href.startsWith('#')) {
      window.location.hash = href
    } else {
      window.location.href = href
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      navigate(filtered[selectedIndex].href)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9990] bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-[9991] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
        <div
          className="w-full max-w-lg bg-white border-2 border-gray-200 shadow-2xl pointer-events-auto overflow-hidden"
          style={{ borderRadius: '2px', animation: 'cmdFadeIn 0.15s ease-out' }}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b-2 border-gray-100">
            <span className="text-gray-400 text-lg">🔍</span>
            <input
              ref={inputRef}
              type="text"
              placeholder="搜索工具..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 h-12 bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 font-medium"
            />
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs border border-gray-200 rounded text-gray-400 font-mono">
              Esc
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-72 overflow-y-auto py-2">
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                没有匹配的工具
              </div>
            )}
            {filtered.map((item, i) => (
              <div
                key={item.id}
                onClick={() => navigate(item.href)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  i === selectedIndex ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span className="text-xl w-8 text-center flex-shrink-0">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.title}</div>
                  <div className="text-xs text-gray-500 truncate">{item.description}</div>
                </div>
                {i === selectedIndex && (
                  <span className="text-xs text-blue-400 flex-shrink-0">↵</span>
                )}
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-xs text-gray-400">
            <span>↑↓ 导航</span>
            <span>↵ 打开</span>
            <span>Esc 关闭</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cmdFadeIn {
          from { opacity: 0; transform: scale(0.96) translateY(-8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  )
}
