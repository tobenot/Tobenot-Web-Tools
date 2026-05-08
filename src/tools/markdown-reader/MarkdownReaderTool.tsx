import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'


/* ─── CDN 动态加载 ─── */
declare global {
  interface Window {
    marked: { parse: (md: string) => string }
    html2canvas: (el: HTMLElement, opts?: any) => Promise<HTMLCanvasElement>
    mermaid: {
      initialize: (config: Record<string, unknown>) => void
      run: (options?: { nodes?: HTMLElement[] }) => Promise<void>
    }
  }
}


function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
}

type KrokiDiagramType = 'plantuml' | 'graphviz'

const KROKI_DIAGRAM_ENDPOINTS: Record<KrokiDiagramType, string> = {
  plantuml: 'plantuml',
  graphviz: 'graphviz',
}

const KROKI_DIAGRAM_LABELS: Record<KrokiDiagramType, string> = {
  plantuml: 'PlantUML',
  graphviz: 'Graphviz',
}

function isKrokiDiagramType(type: string | undefined): type is KrokiDiagramType {
  return type === 'plantuml' || type === 'graphviz'
}

function normalizeDiagramBlocks(html: string): string {
  return html.replace(
    /<pre><code class="[^"]*\blanguage-([a-z0-9_-]+)\b[^"]*">([\s\S]*?)<\/code><\/pre>/gi,
    (match, rawLanguage: string, content: string) => {
      const language = rawLanguage.toLowerCase()
      if (language === 'mermaid') return `<div class="mermaid">${content}</div>`
      if (language === 'plantuml' || language === 'puml') {
        return `<div class="kroki-diagram" data-diagram-type="plantuml"><pre class="kroki-source">${content}</pre><div class="kroki-output">PlantUML 图表渲染中...</div></div>`
      }
      if (language === 'graphviz' || language === 'dot') {
        return `<div class="kroki-diagram" data-diagram-type="graphviz"><pre class="kroki-source">${content}</pre><div class="kroki-output">Graphviz 图表渲染中...</div></div>`
      }
      return match
    },
  )
}


/* ─── 样式定义 ─── */

type StyleKey = 'xiaohongshu' | 'clean' | 'dark' | 'pink' | 'business'

const STYLE_OPTIONS: { key: StyleKey; label: string }[] = [
  { key: 'business', label: '商务风格' },
  { key: 'xiaohongshu', label: '小红书风格' },
  { key: 'clean', label: '简约清新' },
  { key: 'dark', label: '深夜模式' },
  { key: 'pink', label: '少女粉风格' },
]

/* ─── 默认内容 ─── */
const DEFAULT_MD = `# 技术文档

## 概述

本文档介绍了系统的核心功能和技术架构设计。

## 系统架构

系统采用模块化设计，主要包含以下几个核心模块：

- 数据处理模块
- 业务逻辑层
- 接口服务层
- 前端展示层

## 核心功能

### 数据处理

系统提供了**高效的数据处理能力**，支持*实时数据流*处理和批量数据处理。

### API 接口

提供 RESTful API 接口，支持标准的 HTTP 请求方法。

> 注意：所有 API 请求需要携带有效的认证令牌。

## 代码示例

\`\`\`javascript
function processData(data) {
  return data.filter(item => item.isValid);
}
\`\`\`

## 相关链接

[查看完整文档](https://example.com/docs)`

/* ─── TOC 类型 ─── */
interface TocItem {
  id: string
  text: string
  level: number
}

/* ─── 基础排版恢复（抵消 Tailwind Preflight reset） ─── */
const BASE_PREVIEW_CSS = `
  .md-preview { font-family: 'PingFang SC','Microsoft YaHei',sans-serif; line-height: 1.8; color: #333; padding: 20px 30px; }
  .md-preview h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; }
  .md-preview h2 { font-size: 1.5em; font-weight: bold; margin: 0.83em 0; }
  .md-preview h3 { font-size: 1.25em; font-weight: bold; margin: 1em 0; }
  .md-preview h4 { font-size: 1.1em; font-weight: bold; margin: 1em 0; }
  .md-preview h5, .md-preview h6 { font-size: 1em; font-weight: bold; margin: 1em 0; }
  .md-preview p { margin: 1em 0; }
  .md-preview ul { list-style: disc; padding-left: 2em; margin: 1em 0; }
  .md-preview ol { list-style: decimal; padding-left: 2em; margin: 1em 0; }
  .md-preview li { margin: 0.5em 0; }
  .md-preview blockquote { margin: 1em 0; padding: 10px 20px; border-left: 4px solid #ddd; background: #f9f9f9; }
  .md-preview pre { margin: 1em 0; padding: 16px; background: #f6f8fa; border-radius: 6px; overflow-x: auto; }
  .md-preview code { font-family: Menlo,Monaco,Consolas,"Courier New",monospace; font-size: 0.9em; }
  .md-preview a { color: #3498db; text-decoration: underline; }
  .md-preview img { max-width: 100%; height: auto; }
  .md-preview hr { border: none; border-top: 1px solid #eee; margin: 2em 0; }
  .md-preview table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  .md-preview th, .md-preview td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  .md-preview th { background: #f6f8fa; font-weight: 600; }
  .md-preview strong { font-weight: bold; }
  .md-preview em { font-style: italic; }
  .md-preview .mermaid,
  .md-preview .kroki-diagram { margin: 1.5em 0; padding: 16px; overflow-x: auto; text-align: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; }
  .md-preview .mermaid svg,
  .md-preview .kroki-output img { display: block; max-width: 100%; height: auto; margin: 0 auto; }

  .md-preview .kroki-source { display: none; }
  .md-preview .kroki-output { min-height: 24px; }
  .md-preview .mermaid-error,
  .md-preview .kroki-error { margin: 1em 0; padding: 12px; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; white-space: pre-wrap; text-align: left; }
  .style-dark .mermaid,
  .style-dark .kroki-diagram { background: #252525; border-color: #3a3a3a; }


  /* ─── TOC 面板样式 ─── */

  .toc-panel { font-size: 13px; line-height: 1.6; }
  .toc-panel .toc-item { display: block; padding: 3px 8px; border-radius: 4px; cursor: pointer; color: #555; text-decoration: none; transition: all 0.15s ease; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .toc-panel .toc-item:hover { background: #f0f4ff; color: #4f46e5; }
  .toc-panel .toc-item.active { background: #eef2ff; color: #4338ca; font-weight: 600; border-left: 3px solid #4f46e5; padding-left: 5px; }
`

/* ─── 各风格的 CSS（嵌入 style 标签） ─── */
const STYLE_CSS: Record<StyleKey, string> = {
  xiaohongshu: `
    .md-preview.style-xiaohongshu { background-color: #fff; color: #333; font-family: 'PingFang SC','Microsoft YaHei',sans-serif; padding: 25px; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,.05); }
    .style-xiaohongshu h1 { font-size: 24px; color: #ff2d55; margin-bottom: 20px; font-weight: 600; border-bottom: none; }
    .style-xiaohongshu h2 { font-size: 20px; color: #333; margin-top: 25px; border-bottom: none; font-weight: 600; }
    .style-xiaohongshu p { font-size: 16px; line-height: 1.8; color: #333; margin-bottom: 15px; }
    .style-xiaohongshu ul,.style-xiaohongshu ol { padding-left: 20px; margin-bottom: 20px; }
    .style-xiaohongshu li { margin-bottom: 10px; }
    .style-xiaohongshu a { color: #ff2d55; text-decoration: none; border-bottom: 1px solid #ff2d55; }
    .style-xiaohongshu blockquote { border-left: 4px solid #ff9bb3; padding: 10px 15px; margin: 20px 0; background-color: #fef8f9; border-radius: 0 8px 8px 0; }
    .style-xiaohongshu code { background: #f8f8f8; padding: 3px 6px; border-radius: 4px; font-family: Menlo,Monaco,Consolas,"Courier New",monospace; font-size: 14px; color: #ff2d55; }
    .style-xiaohongshu pre { background: #f8f8f8; padding: 15px; border-radius: 8px; overflow-x: auto; margin: 20px 0; }
    .style-xiaohongshu pre code { background: transparent; color: #333; padding: 0; }
    .style-xiaohongshu img { max-width: 100%; border-radius: 8px; margin: 15px 0; }
    .style-xiaohongshu strong { font-weight: 600; color: #ff2d55; }
    .style-xiaohongshu em { font-style: italic; color: #666; }
  `,
  clean: `
    .md-preview.style-clean { background-color: #ffffff; color: #444; padding: 25px; line-height: 1.7; box-shadow: 0 2px 12px rgba(0,0,0,.05); border-radius: 6px; }
    .style-clean h1 { color: #2c3e50; font-size: 28px; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; }
    .style-clean h2 { color: #3498db; font-size: 22px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; }
    .style-clean a { color: #3498db; text-decoration: none; }
    .style-clean blockquote { border-left: 4px solid #3498db; padding: 10px 20px; background: #f9f9f9; margin: 20px 0; }
    .style-clean code { background: #f5f7fa; color: #e74c3c; padding: 2px 5px; border-radius: 3px; }
    .style-clean pre { background: #f5f7fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
  `,
  dark: `
    .md-preview.style-dark { background-color: #1a1a1a; color: #e6e6e6; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,.3); border-radius: 6px; }
    .style-dark h1 { color: #bb86fc; border-bottom: 1px solid #333; padding-bottom: 10px; }
    .style-dark h2 { color: #03dac6; border-bottom: 1px solid #333; padding-bottom: 8px; }
    .style-dark a { color: #bb86fc; text-decoration: none; }
    .style-dark blockquote { border-left: 4px solid #03dac6; padding: 10px 20px; background: rgba(255,255,255,.05); margin: 20px 0; }
    .style-dark code { background: #333; color: #ff7597; padding: 3px 6px; border-radius: 4px; }
    .style-dark pre { background: #2d2d2d; padding: 15px; border-radius: 5px; overflow-x: auto; }
  `,
  pink: `
    .md-preview.style-pink { background-color: #fff6f8; color: #5a4a4a; padding: 25px; border-radius: 12px; box-shadow: 0 5px 15px rgba(255,185,195,.2); }
    .style-pink h1 { color: #ff85a2; text-align: center; font-weight: 700; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px dotted #ffc0cb; }
    .style-pink h2 { color: #fd79a8; padding-bottom: 8px; border-bottom: 1px dashed #ffc0cb; }
    .style-pink a { color: #ff5e94; text-decoration: none; border-bottom: 1px solid #ffb7c5; padding-bottom: 2px; }
    .style-pink blockquote { border-left: 5px solid #ffb7c5; padding: 10px 20px; background: rgba(255,183,197,.1); margin: 20px 0; border-radius: 0 8px 8px 0; }
    .style-pink code { background: #ffeaef; color: #e84393; padding: 3px 6px; border-radius: 4px; }
    .style-pink pre { background: #ffeaef; padding: 15px; border-radius: 8px; overflow-x: auto; }
    .style-pink strong { color: #e84393; font-weight: 600; }
  `,
  business: `
    .md-preview.style-business { background-color: #ffffff; color: #333; padding: 30px; box-shadow: 0 2px 15px rgba(0,0,0,.08); border-radius: 5px; font-family: 'Helvetica Neue',Arial,sans-serif; }
    .style-business h1 { color: #2c3e50; font-size: 26px; border-bottom: 2px solid #eaecef; padding-bottom: 12px; margin-top: 0; }
    .style-business h2 { color: #34495e; font-size: 22px; border-bottom: 1px solid #eaecef; padding-bottom: 8px; }
    .style-business a { color: #3498db; text-decoration: none; }
    .style-business blockquote { border-left: 4px solid #ddd; padding: 12px 20px; background: #f8f9fa; margin: 20px 0; color: #666; }
    .style-business code { background: #f6f8fa; color: #e74c3c; padding: 3px 6px; border-radius: 3px; font-family: Consolas,Monaco,'Andale Mono',monospace; }
    .style-business pre { background: #f6f8fa; padding: 16px; border-radius: 5px; overflow-x: auto; }
  `,
}

/* ─── localStorage 持久化 ─── */
const STORAGE_KEY_MD = 'md-reader:content'
const STORAGE_KEY_STYLE = 'md-reader:style'
const STORAGE_KEY_EDITOR_WIDTH = 'md-reader:editor-width'
const STORAGE_KEY_READING_PROGRESS = 'md-reader:reading-progress'
const DEFAULT_EDITOR_WIDTH = 36
const MIN_EDITOR_WIDTH = 24
const MAX_EDITOR_WIDTH = 55


function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw !== null) return raw as unknown as T
  } catch { /* 无痕模式或存储不可用 */ }
  return fallback
}

function clampEditorWidth(value: number): number {
  return Math.min(MAX_EDITOR_WIDTH, Math.max(MIN_EDITOR_WIDTH, value))
}

function loadEditorWidthFromStorage(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EDITOR_WIDTH)
    const value = raw === null ? Number.NaN : Number(raw)
    if (Number.isFinite(value)) return clampEditorWidth(value)
  } catch { /* ignore */ }
  return DEFAULT_EDITOR_WIDTH
}

interface ReadingProgress {
  previewRatio: number
  editorRatio: number
}

function clampScrollRatio(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function loadReadingProgressFromStorage(): ReadingProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_READING_PROGRESS)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ReadingProgress>
    return {
      previewRatio: clampScrollRatio(Number(parsed.previewRatio)),
      editorRatio: clampScrollRatio(Number(parsed.editorRatio)),
    }
  } catch {
    return null
  }
}


export function MarkdownReaderTool() {

  const [md, setMd] = useState(() => loadFromStorage(STORAGE_KEY_MD, DEFAULT_MD))
  const [style, setStyle] = useState<StyleKey>(() => loadFromStorage<StyleKey>(STORAGE_KEY_STYLE, 'business'))
  const [html, setHtml] = useState('')
  const [ready, setReady] = useState(false)
  const [mermaidReady, setMermaidReady] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [tocOpen, setTocOpen] = useState(true)
  const [syncScroll, setSyncScroll] = useState(true)
  const [activeHeadingId, setActiveHeadingId] = useState<string>('')
  const [editorWidth, setEditorWidth] = useState(loadEditorWidthFromStorage)
  const [isResizingColumns, setIsResizingColumns] = useState(false)
  const layoutRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const previewWrapRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollSyncSourceRef = useRef<'editor' | 'preview' | null>(null)
  const scrollSyncTimerRef = useRef<number | null>(null)
  const readingProgressRef = useRef<ReadingProgress | null>(loadReadingProgressFromStorage())
  const hasRestoredReadingProgressRef = useRef(false)



  /* 自动保存到 localStorage（防抖 500ms） */
  const saveTimerRef = useRef<number | null>(null)
  useEffect(() => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_MD, md)
      } catch { /* quota exceeded or unavailable */ }
    }, 500)
    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    }
  }, [md])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STYLE, style)
    } catch { /* ignore */ }
  }, [style])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EDITOR_WIDTH, String(editorWidth))
    } catch { /* ignore */ }
  }, [editorWidth])

  /* 加载外部脚本 */

  useEffect(() => {
    Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js'),
      loadScript('https://html2canvas.hertzen.com/dist/html2canvas.min.js'),
    ]).then(() => setReady(true))

    loadScript('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js')
      .then(() => setMermaidReady(true))
      .catch((error) => console.error('Mermaid 加载失败', error))
  }, [])


  /* 渲染 Markdown */
  useEffect(() => {
    if (!ready) return
    try {
      // 解析并为标题注入 id
      let parsed = normalizeDiagramBlocks(window.marked.parse(md) as string)

      let headingIndex = 0
      parsed = parsed.replace(/<h([1-6])([^>]*)>(.*?)<\/h[1-6]>/gi, (_match, level, attrs, content) => {
        const id = `toc-heading-${headingIndex++}`
        return `<h${level}${attrs} id="${id}">${content}</h${level}>`
      })
      setHtml(parsed)

    } catch {
      setHtml('<p style="color:red">Markdown 解析错误</p>')
    }
  }, [md, ready])

  /* 渲染 Mermaid 图表 */
  useEffect(() => {
    if (!ready || !mermaidReady || !html || !window.mermaid) return

    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: style === 'dark' ? 'dark' : 'default',
    })

    const timer = window.setTimeout(() => {
      const nodes: HTMLElement[] = previewRef.current
        ? Array.from(previewRef.current.querySelectorAll<HTMLElement>('.mermaid'))
        : []
      if (nodes.length === 0) return


      window.mermaid.run({ nodes }).catch((error) => {
        console.error('Mermaid 渲染失败', error)
        nodes.forEach((node) => {
          node.classList.add('mermaid-error')
          node.textContent = `Mermaid 渲染失败：${error instanceof Error ? error.message : String(error)}`
        })
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [html, mermaidReady, ready, style])

  /* 渲染 PlantUML / Graphviz 图表 */
  useEffect(() => {
    if (!ready || !html) return

    const controller = new AbortController()
    const objectUrls: string[] = []

    const timer = window.setTimeout(() => {
      const nodes: HTMLElement[] = previewRef.current
        ? Array.from(previewRef.current.querySelectorAll<HTMLElement>('.kroki-diagram[data-diagram-type]'))
        : []

      nodes.forEach((node) => {
        void (async () => {
          const type = node.dataset.diagramType
          if (!isKrokiDiagramType(type)) return

          const label = KROKI_DIAGRAM_LABELS[type]
          const source = node.querySelector<HTMLElement>('.kroki-source')?.textContent?.trim()
          const output = node.querySelector<HTMLElement>('.kroki-output')
          if (!source || !output) return

          output.classList.remove('kroki-error')
          output.textContent = `${label} 图表渲染中...`

          try {
            const response = await fetch(`https://kroki.io/${KROKI_DIAGRAM_ENDPOINTS[type]}/svg`, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
              body: source,
              signal: controller.signal,
            })

            if (!response.ok) {
              const message = await response.text()
              throw new Error(message || `HTTP ${response.status}`)
            }

            const svg = await response.text()
            if (controller.signal.aborted) return

            const objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
            objectUrls.push(objectUrl)

            const img = document.createElement('img')
            img.src = objectUrl
            img.alt = `${label} 图表`

            output.textContent = ''
            output.appendChild(img)
          } catch (error) {
            if (controller.signal.aborted) return
            console.error(`${label} 渲染失败`, error)
            output.classList.add('kroki-error')
            output.textContent = `${label} 渲染失败：${error instanceof Error ? error.message : String(error)}`
          }
        })()
      })
    }, 0)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [html, ready, style])

  /* 从 html 中提取 TOC 项 */
  const tocItems: TocItem[] = useMemo(() => {

    const items: TocItem[] = []
    const regex = /<h([1-6])[^>]*id="(toc-heading-\d+)"[^>]*>(.*?)<\/h[1-6]>/gi
    let match: RegExpExecArray | null
    while ((match = regex.exec(html)) !== null) {
      // 去掉 html 标签以获取纯文本
      const text = match[3].replace(/<[^>]*>/g, '')
      items.push({ id: match[2], text, level: parseInt(match[1]) })
    }
    return items
  }, [html])

  const resetScrollSyncSource = useCallback(() => {
    if (scrollSyncTimerRef.current !== null) {
      window.clearTimeout(scrollSyncTimerRef.current)
    }
    scrollSyncTimerRef.current = window.setTimeout(() => {
      scrollSyncSourceRef.current = null
      scrollSyncTimerRef.current = null
    }, 120)
  }, [])

  const syncScrollByRatio = useCallback((source: HTMLElement, target: HTMLElement) => {
    const sourceMax = source.scrollHeight - source.clientHeight
    const targetMax = target.scrollHeight - target.clientHeight
    target.scrollTop = sourceMax > 0 ? (source.scrollTop / sourceMax) * targetMax : 0
  }, [])

  const syncEditorToPreview = useCallback(() => {
    const editor = textareaRef.current
    const preview = previewWrapRef.current
    if (!syncScroll || !editor || !preview || scrollSyncSourceRef.current === 'preview') return
    scrollSyncSourceRef.current = 'editor'
    syncScrollByRatio(editor, preview)
    resetScrollSyncSource()
  }, [resetScrollSyncSource, syncScroll, syncScrollByRatio])

  const syncPreviewToEditor = useCallback(() => {
    const editor = textareaRef.current
    const preview = previewWrapRef.current
    if (!syncScroll || !editor || !preview || scrollSyncSourceRef.current === 'editor') return
    scrollSyncSourceRef.current = 'preview'
    syncScrollByRatio(preview, editor)
    resetScrollSyncSource()
  }, [resetScrollSyncSource, syncScroll, syncScrollByRatio])

  const persistReadingProgress = useCallback(() => {
    const preview = previewWrapRef.current
    const editor = textareaRef.current
    if (!preview && !editor) return

    const previewMax = preview ? preview.scrollHeight - preview.clientHeight : 0
    const editorMax = editor ? editor.scrollHeight - editor.clientHeight : 0
    const nextProgress: ReadingProgress = {
      previewRatio: preview && previewMax > 0 ? clampScrollRatio(preview.scrollTop / previewMax) : 0,
      editorRatio: editor && editorMax > 0 ? clampScrollRatio(editor.scrollTop / editorMax) : 0,
    }

    readingProgressRef.current = nextProgress
    try {
      localStorage.setItem(STORAGE_KEY_READING_PROGRESS, JSON.stringify(nextProgress))
    } catch { /* ignore */ }
  }, [])

  const handleEditorScroll = useCallback(() => {
    syncEditorToPreview()
    persistReadingProgress()
  }, [persistReadingProgress, syncEditorToPreview])

  const updateEditorWidthByPointer = useCallback((clientX: number) => {

    const layout = layoutRef.current
    if (!layout) return
    const rect = layout.getBoundingClientRect()
    if (rect.width <= 0) return
    setEditorWidth(clampEditorWidth(((clientX - rect.left) / rect.width) * 100))
  }, [])

  const startColumnResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    updateEditorWidthByPointer(event.clientX)
    setIsResizingColumns(true)
  }, [updateEditorWidthByPointer])

  const handleResizeKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    setEditorWidth((current) => clampEditorWidth(current + (event.key === 'ArrowRight' ? 2 : -2)))
  }, [])

  useEffect(() => {
    if (!isResizingColumns) return

    const originalCursor = document.body.style.cursor
    const originalUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handlePointerMove = (event: PointerEvent) => updateEditorWidthByPointer(event.clientX)
    const stopResize = () => setIsResizingColumns(false)

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize)
    window.addEventListener('pointercancel', stopResize)

    return () => {
      document.body.style.cursor = originalCursor
      document.body.style.userSelect = originalUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResize)
      window.removeEventListener('pointercancel', stopResize)
    }
  }, [isResizingColumns, updateEditorWidthByPointer])

  useEffect(() => () => {
    if (scrollSyncTimerRef.current !== null) {
      window.clearTimeout(scrollSyncTimerRef.current)
    }
  }, [])

  /* 滚动高亮 + 预览到编辑器同步：监听预览区域的 scroll 事件 */

  useEffect(() => {
    const container = previewWrapRef.current
    if (!container) return

    const handleScroll = () => {
      if (tocItems.length > 0) {
        const headings = container.querySelectorAll<HTMLElement>('[id^="toc-heading-"]')
        let currentId = ''
        const offset = 60 // 视口偏移量

        for (const heading of headings) {
          const rect = heading.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()
          if (rect.top - containerRect.top <= offset) {
            currentId = heading.id
          } else {
            break
          }
        }
        setActiveHeadingId(currentId || (tocItems[0]?.id ?? ''))
      }
      syncPreviewToEditor()
      persistReadingProgress()
    }


    container.addEventListener('scroll', handleScroll, { passive: true })
    // 初始化
    handleScroll()
    return () => container.removeEventListener('scroll', handleScroll)
  }, [persistReadingProgress, syncPreviewToEditor, tocItems])

  useEffect(() => {
    if (!ready || !html || hasRestoredReadingProgressRef.current) return

    const progress = readingProgressRef.current
    hasRestoredReadingProgressRef.current = true
    if (!progress) return

    const restoreTimer = window.setTimeout(() => {
      const preview = previewWrapRef.current
      const editor = textareaRef.current

      if (preview) {
        const previewMax = preview.scrollHeight - preview.clientHeight
        preview.scrollTop = previewMax > 0 ? clampScrollRatio(progress.previewRatio) * previewMax : 0
      }
      if (editor) {
        const editorMax = editor.scrollHeight - editor.clientHeight
        editor.scrollTop = editorMax > 0 ? clampScrollRatio(progress.editorRatio) * editorMax : 0
      }
    }, 0)

    return () => window.clearTimeout(restoreTimer)
  }, [html, ready])

  useEffect(() => () => {
    persistReadingProgress()
  }, [persistReadingProgress])

  /* 点击 TOC 跳转 */

  const scrollToHeading = useCallback((id: string) => {
    const container = previewWrapRef.current
    if (!container) return
    const el = container.querySelector(`#${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveHeadingId(id)
    }
  }, [])

  /* 辅助编辑 */
  const wrapSelection = useCallback((before: string, after: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = md.substring(start, end)
    const newText = md.substring(0, start) + before + selected + after + md.substring(end)
    setMd(newText)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + before.length, start + before.length + selected.length)
    }, 0)
  }, [md])

  const insertAtLineStart = useCallback((prefix: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const pos = ta.selectionStart
    const lineStart = md.lastIndexOf('\n', pos - 1) + 1
    const newText = md.substring(0, lineStart) + prefix + md.substring(lineStart)
    setMd(newText)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(pos + prefix.length, pos + prefix.length)
    }, 0)
  }, [md])

  /* 导出当前预览为图片 */
  const exportAsImage = useCallback(async () => {
    if (!previewRef.current || !window.html2canvas) return
    setExporting(true)
    try {
      const canvas = await window.html2canvas(previewRef.current, {
        backgroundColor: null,
        useCORS: true,
        scale: 2,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = '预览图片_' + new Date().toISOString().replace(/[:.]/g, '-') + '.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      alert('导出图片失败，请重试！')
      console.error(e)
    } finally {
      setExporting(false)
    }
  }, [])

  /* 导出全部分屏 */
  const exportAllScreens = useCallback(async () => {
    const previewElement = previewRef.current
    if (!previewElement || !window.html2canvas) return
    setExporting(true)

    const originalOverflow = previewElement.style.overflow
    const originalPosition = previewElement.style.position
    const originalHeight = previewElement.style.height

    try {
      previewElement.style.overflow = 'visible'
      previewElement.style.position = 'relative'

      const totalHeight = previewElement.scrollHeight
      const viewportHeight = previewElement.clientHeight || 600
      const screensCount = Math.ceil(totalHeight / viewportHeight)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const images: HTMLAnchorElement[] = []

      for (let i = 0; i < screensCount; i++) {
        const currentScrollTop = i * viewportHeight
        const cloneElement = previewElement.cloneNode(true) as HTMLElement
        cloneElement.style.height = `${viewportHeight}px`
        cloneElement.style.overflow = 'hidden'
        cloneElement.style.position = 'absolute'
        cloneElement.style.top = '0'
        cloneElement.style.left = '0'
        cloneElement.style.pointerEvents = 'none'
        cloneElement.scrollTop = currentScrollTop
        previewElement.parentNode!.appendChild(cloneElement)

        const canvas = await window.html2canvas(cloneElement, {
          backgroundColor: null,
          useCORS: true,
          scale: 2,
          windowHeight: viewportHeight,
          scrollY: -currentScrollTop,
          logging: false,
        })

        previewElement.parentNode!.removeChild(cloneElement)

        const link = document.createElement('a')
        link.download = `预览图片_${timestamp}_第${i + 1}屏.png`
        link.href = canvas.toDataURL('image/png')
        images.push(link)
      }

      // 依次下载
      for (let i = 0; i < images.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 300))
        images[i].click()
      }
    } catch (e) {
      alert('导出图片失败，请重试！')
      console.error(e)
    } finally {
      previewElement.style.overflow = originalOverflow
      previewElement.style.position = originalPosition
      previewElement.style.height = originalHeight
      setExporting(false)
    }
  }, [])

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100%' }}>
      {/* 样式注入 */}
      <style>{BASE_PREVIEW_CSS + '\n' + Object.values(STYLE_CSS).join('\n')}</style>

      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <button onClick={() => wrapSelection('**', '**')} className="px-3 py-1.5 text-sm font-medium bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors">加粗</button>
        <button onClick={() => wrapSelection('*', '*')} className="px-3 py-1.5 text-sm font-medium bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors">斜体</button>
        <button onClick={() => insertAtLineStart('## ')} className="px-3 py-1.5 text-sm font-medium bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors">标题</button>
        <button onClick={() => wrapSelection('`', '`')} className="px-3 py-1.5 text-sm font-medium bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors">代码</button>
        <button onClick={() => wrapSelection('[', '](链接地址)')} className="px-3 py-1.5 text-sm font-medium bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors">链接</button>
        <button onClick={() => insertAtLineStart('> ')} className="px-3 py-1.5 text-sm font-medium bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors">引用</button>
        <button onClick={() => insertAtLineStart('- ')} className="px-3 py-1.5 text-sm font-medium bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors">列表</button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={exportAsImage}
          disabled={exporting}
          className="px-3 py-1.5 text-sm font-medium bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          {exporting ? '导出中...' : '导出图片'}
        </button>
        <button
          onClick={exportAllScreens}
          disabled={exporting}
          className="px-3 py-1.5 text-sm font-medium bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          导出全部页面
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={() => setTocOpen(!tocOpen)}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${tocOpen ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          📑 目录
        </button>
        <button
          onClick={() => setSyncScroll(!syncScroll)}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${syncScroll ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          title="编辑器与预览区双向滚动同步"
        >
          📍 同步滚动
        </button>

        <label className="hidden lg:flex items-center gap-2 px-2 text-xs text-gray-500">
          左栏
          <input
            type="range"
            min={MIN_EDITOR_WIDTH}
            max={MAX_EDITOR_WIDTH}
            value={editorWidth}
            onChange={(e) => setEditorWidth(clampEditorWidth(Number(e.target.value)))}
            className="w-24 accent-indigo-500"
            title="调整编辑区宽度"
          />
          <span className="w-9 text-right text-gray-600">{Math.round(editorWidth)}%</span>
        </label>

        <div className="ml-auto">

          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as StyleKey)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white text-gray-700 focus:border-indigo-400 focus:outline-none"
          >
            {STYLE_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 编辑器 + 预览双栏（撑满剩余高度） */}
      <div ref={layoutRef} className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* 编辑器 */}
        <div className="min-w-0 min-h-0" style={{ flex: `0 0 ${editorWidth}%` }}>
          <textarea
            ref={textareaRef}
            value={md}
            onChange={(e) => setMd(e.target.value)}
            onScroll={handleEditorScroll}

            className="w-full h-full resize-none overscroll-contain p-4 text-sm leading-relaxed border-r border-gray-200 bg-white focus:outline-none font-mono"
            placeholder="在此输入 Markdown..."
          />
        </div>

        <div
          role="separator"
          aria-label="调整编辑区和预览区宽度"
          aria-orientation="vertical"
          tabIndex={0}
          onPointerDown={startColumnResize}
          onKeyDown={handleResizeKeyDown}
          className={`hidden lg:flex w-2 shrink-0 cursor-col-resize items-center justify-center border-x border-gray-200 bg-gray-100 transition-colors hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-300 ${isResizingColumns ? 'bg-indigo-100' : ''}`}
          title="拖动调整左右栏宽度，或用左右方向键微调"
        >
          <div className="h-10 w-0.5 rounded-full bg-gray-300" />
        </div>

        {/* 预览 + TOC */}
        <div className="flex-1 min-w-0 min-h-0 flex">

          {/* TOC 侧栏 */}
          {tocOpen && tocItems.length > 0 && (
            <div className="toc-panel w-48 shrink-0 overscroll-contain border-r border-gray-200 bg-gray-50/80 overflow-y-auto p-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">📑 目录导航</div>
              {tocItems.map(item => (
                <div
                  key={item.id}
                  className={`toc-item ${activeHeadingId === item.id ? 'active' : ''}`}
                  style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
                  onClick={() => scrollToHeading(item.id)}
                  title={item.text}
                >
                  {item.text}
                </div>
              ))}
            </div>
          )}

          {/* 预览内容 */}
          <div ref={previewWrapRef} className="flex-1 min-w-0 min-h-0 overflow-auto overscroll-contain">
            {!ready ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">加载渲染引擎中...</div>
            ) : (
              <div
                key={style}
                ref={previewRef}
                className={`md-preview style-${style}`}
                style={{ lineHeight: 1.8, minHeight: '100%' }}
                dangerouslySetInnerHTML={{ __html: html }}
              />

            )}
          </div>
        </div>
      </div>
    </div>
  )
}
