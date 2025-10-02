import { useState, useEffect, useRef, useCallback } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

interface TocEntry {
  level: number
  text: string
  id: string
}

export function MarkdownReaderTool() {
  const [markdown, setMarkdown] = useState('')
  const [html, setHtml] = useState('')
  const [toc, setToc] = useState<TocEntry[]>([])
  const [activeHeading, setActiveHeading] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  const generateHtmlAndToc = useCallback((md: string) => {
    const newToc: TocEntry[] = []
    const renderer = new marked.Renderer()
    let headingCounter = 0

    renderer.heading = (text, level, raw) => {
      const escapedText = raw.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      let id = escapedText
      if (!id || id.length === 0) {
        id = `heading-${++headingCounter}`
      }
      newToc.push({ level, text, id })
      return `<h${level} id="${id}">${text}</h${level}>`
    }

    marked.use({ renderer })
    const dirtyHtml = marked(md) as string
    const cleanHtml = DOMPurify.sanitize(dirtyHtml, { USE_PROFILES: { html: true } })
    
    setHtml(cleanHtml)
    setToc(newToc)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      generateHtmlAndToc(markdown)
    }, 150)
    return () => clearTimeout(timer)
  }, [markdown, generateHtmlAndToc])
  
  const loadReadme = useCallback(async () => {
    try {
      const res = await fetch('/README.md')
      const text = await res.text()
      setMarkdown(text)
    } catch (error) {
      console.error('Failed to load README.md', error)
      setMarkdown('# 加载 README.md 失败')
    }
  }, [])

  useEffect(() => {
    loadReadme()
  }, [loadReadme])

  useEffect(() => {
    const previewEl = previewRef.current
    if (!previewEl) return

    const headings = Array.from(previewEl.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLElement[]
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveHeading(entry.target.id)
        }
      })
    }, { rootMargin: '0px 0px -80% 0px', threshold: 1.0 })

    headings.forEach(h => observer.observe(h))

    return () => {
      headings.forEach(h => observer.unobserve(h))
    }
  }, [html])

  const handleTocClick = (id: string) => {
    const previewEl = previewRef.current
    const heading = previewEl?.querySelector(`#${id}`)
    if (heading) {
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
  
  const handleCopy = () => {
    if (editorRef.current) {
      navigator.clipboard.writeText(editorRef.current.value)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-gray-200 p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-wide text-gray-900">Markdown 阅读器</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={loadReadme}
            className="px-3 py-1.5 border-2 border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
            style={{ borderRadius: '2px' }}
          >
            载入 README.md
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)] gap-6">
        <aside 
          className="bg-white border-2 border-gray-200 p-4" 
          style={{ borderRadius: '2px', maxHeight: 'calc(80vh)', overflowY: 'auto' }}
        >
          <div className="text-base font-bold text-gray-800 mb-3">目录</div>
          <nav className="space-y-1.5">
            {toc.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => { e.preventDefault(); handleTocClick(item.id); }}
                className={`block text-sm transition-colors ${
                  item.level === 1 ? 'pl-0 font-semibold' : item.level === 2 ? 'pl-3' : 'pl-6'
                } ${
                  activeHeading === item.id 
                    ? 'text-blue-600 font-medium' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.text}
              </a>
            ))}
            {toc.length === 0 && <p className="text-sm text-gray-500">暂无目录</p>}
          </nav>
        </aside>

        <div className="grid grid-cols-1 lg:grid-cols-2 border-2 border-gray-200 bg-white" style={{ borderRadius: '2px', overflow: 'hidden' }}>
          {/* Editor */}
          <div className="border-r-2 border-gray-200">
            <div className="flex items-center justify-between px-4 py-2 border-b-2 border-gray-200">
              <div className="text-sm font-semibold text-gray-800">编辑</div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCopy}
                  className="px-2 py-1 text-xs font-medium border-2 border-gray-200 hover:bg-gray-50 transition-colors"
                  style={{ borderRadius: '2px' }}
                >
                  复制
                </button>
                <button 
                  onClick={() => setMarkdown('')}
                  className="px-2 py-1 text-xs font-medium border-2 border-gray-200 hover:bg-gray-50 transition-colors"
                  style={{ borderRadius: '2px' }}
                >
                  清空
                </button>
              </div>
            </div>
            <textarea
              ref={editorRef}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              spellCheck="false"
              className="w-full h-[70vh] p-4 font-mono text-sm outline-none resize-none bg-white text-gray-900"
              placeholder="# 在此输入 Markdown..."
            />
          </div>

          {/* Preview */}
          <div className="relative">
            <div className="flex items-center justify-between px-4 py-2 border-b-2 border-gray-200">
              <div className="text-sm font-semibold text-gray-800">预览</div>
            </div>
            <div
              ref={previewRef}
              className="prose prose-sm max-w-none h-[70vh] overflow-auto p-6"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
