import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'
import { ToolLayout } from '../../components/ToolLayout'
import { CDN, loadScript } from '../../utils/loadScript'
import { sanitizeMarkdownHtml } from '../../utils/sanitize'
import { enrichMarkdownHtml, normalizeFootnoteDefs } from '../markdown-reader/mdEnrich'
import { upgradeFenceBlocks } from '../markdown-reader/fenceUpgraders'
import {
  buildManifest,
  buildTree,
  isMarkdownPath,
  type ArchiveManifest,
  type TreeNode,
} from './archiveCore'
import { loadLinkedTargets, buildDownloadName, type LoadDocResult } from './contentLoader'
import { rewriteMarkdownLinks, decodeAdPath } from './linkRewriter'

/* ─── CDN 动态加载 ─── */
declare global {
  interface Window {
    marked: { parse: (md: string) => string }
    mermaid: {
      initialize: (config: Record<string, unknown>) => void
      run: (options?: { nodes?: HTMLElement[] }) => Promise<void>
    }
  }
}

/* ─── 常量 ─── */
const ACCEPTED_EXTS = '.zip'
const MAX_ZIP_SIZE = 100 * 1024 * 1024 // 与 archiveCore 解压总量上限一致

interface ImageRef {
  path: string
  url: string
}

type ViewState =
  | { kind: 'empty' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'tree'; manifest: ArchiveManifest }

interface LoadedDoc {
  path: string
  text: string
}

/* ─── 渲染 CSS（复用 markdown-reader 的排版基础，微调容器） ─── */
const BASE_PREVIEW_CSS = `
  .md-preview { font-family: 'PingFang SC','Microsoft YaHei',sans-serif; line-height: 1.7; color: #333; padding: 28px 32px 48px; box-sizing: border-box; }
  @media (max-width: 1023.98px) {
    .md-preview { padding: 18px 16px 48px; }
  }
  .md-preview h1 { font-size: 2em; font-weight: bold; margin: 0.4em 0 0.6em; letter-spacing: -0.02em; }
  .md-preview h2 { font-size: 1.45em; font-weight: bold; margin: 1.6em 0 0.7em; padding-bottom: 0.35em; border-bottom: 1px solid rgba(0,0,0,.08); }
  .md-preview h3 { font-size: 1.2em; font-weight: bold; margin: 1.4em 0 0.55em; padding-left: 0.55em; border-left: 3px solid rgba(79,70,229,.45); }
  .md-preview h4 { font-size: 1.08em; font-weight: bold; margin: 1.2em 0; }
  .md-preview h5, .md-preview h6 { font-size: 1em; font-weight: bold; margin: 1em 0; }
  .md-preview p { margin: 1.05em 0; }
  .md-preview ul { list-style: disc; padding-left: 2em; margin: 1.1em 0; }
  .md-preview ol { list-style: decimal; padding-left: 2em; margin: 1.1em 0; }
  .md-preview li { margin: 0.45em 0; }
  .md-preview blockquote { margin: 1.25em 0; padding: 12px 18px; border-left: 4px solid #ddd; background: #f9f9f9; }
  .md-preview pre { margin: 0; padding: 14px 16px; background: transparent; border-radius: 0; overflow-x: auto; }
  .md-preview code { font-family: Menlo,Monaco,Consolas,"Courier New",monospace; font-size: 0.9em; }
  .md-preview p code, .md-preview li code { background: rgba(0,0,0,.05); padding: 0.12em 0.4em; border-radius: 4px; }
  .md-preview a { color: #3498db; text-decoration: underline; }
  .md-preview img { max-width: 100%; height: auto; }
  .md-preview hr { border: none; border-top: 1px solid #eee; margin: 2.2em 0; }
  .md-preview table { border-collapse: collapse; width: 100%; margin: 1.25em 0; }
  .md-preview th, .md-preview td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  .md-preview th { background: #f6f8fa; font-weight: 600; }
  .md-preview strong { font-weight: 700; color: #1a1a1a; }
  .md-preview em { font-style: italic; }
  .md-preview .mermaid,
  .md-preview .kroki-diagram { margin: 1.6em 0; padding: 16px; overflow-x: auto; text-align: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; }
  .md-preview .mermaid svg,
  .md-preview .kroki-output img { display: block; max-width: 100%; height: auto; margin: 0 auto; }

  .md-preview .kroki-source { display: none; }
  .md-preview .kroki-output { min-height: 24px; }
  .md-preview .mermaid-error,
  .md-preview .kroki-error { margin: 1em 0; padding: 12px; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; white-space: pre-wrap; text-align: left; }

  /* Callout */
  .md-preview .md-callout { margin: 1.4em 0; padding: 14px 16px 14px 18px; border-radius: 8px; border-left: 4px solid #94a3b8; background: #f8fafc; }
  .md-preview .md-callout-title { font-weight: 700; font-size: 0.92em; letter-spacing: 0.02em; margin-bottom: 0.35em; }
  .md-preview .md-callout-body > :first-child { margin-top: 0; }
  .md-preview .md-callout-body > :last-child { margin-bottom: 0; }
  .md-preview .md-callout-note { border-left-color: #3b82f6; background: #eff6ff; }
  .md-preview .md-callout-note .md-callout-title { color: #1d4ed8; }
  .md-preview .md-callout-tip { border-left-color: #10b981; background: #ecfdf5; }
  .md-preview .md-callout-tip .md-callout-title { color: #047857; }
  .md-preview .md-callout-important { border-left-color: #8b5cf6; background: #f5f3ff; }
  .md-preview .md-callout-important .md-callout-title { color: #6d28d9; }
  .md-preview .md-callout-warning,
  .md-preview .md-callout-caution { border-left-color: #f59e0b; background: #fffbeb; }
  .md-preview .md-callout-warning .md-callout-title,
  .md-preview .md-callout-caution .md-callout-title { color: #b45309; }
  .md-preview .md-callout-decision { border-left-color: #f97316; background: #fff7ed; }
  .md-preview .md-callout-decision .md-callout-title { color: #c2410c; }
  .md-preview .md-callout-insight { border-left-color: #0ea5e9; background: #f0f9ff; }
  .md-preview .md-callout-insight .md-callout-title { color: #0369a1; font-size: 1.02em; }
  .md-preview .md-callout-insight .md-callout-body { font-size: 1.05em; line-height: 1.75; }

  /* 段首标签 */
  .md-preview .md-label-badge { display: inline-block; font-size: 0.78em; font-weight: 700; line-height: 1.2; padding: 0.18em 0.55em; border-radius: 4px; background: #eef2ff; color: #4338ca; vertical-align: 0.05em; margin-right: 0.35em; }
  .md-preview .md-label-decision { background: #ffedd5; color: #c2410c; }
  .md-preview .md-label-sep { margin-right: 0.15em; }

  /* 代码 chrome */
  .md-preview .md-code-block { margin: 1.35em 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #f6f8fa; }
  .md-preview .md-code-chrome { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 12px; background: #eef1f4; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
  .md-preview .md-code-lang { font-family: Menlo,Monaco,Consolas,monospace; color: #64748b; text-transform: lowercase; }
  .md-preview .md-code-copy { cursor: pointer; user-select: none; color: #475569; padding: 2px 8px; border-radius: 4px; border: 1px solid transparent; }
  .md-preview .md-code-copy:hover { background: #fff; border-color: #cbd5e1; color: #0f172a; }
  .md-preview .md-code-copy:focus { outline: 2px solid #818cf8; outline-offset: 1px; }
  .md-preview .md-code-block pre { margin: 0; }
  .md-preview .md-code-block code { background: transparent; color: inherit; padding: 0; font-size: 0.88em; line-height: 1.55; }
  .md-preview .md-code-comment { color: #6b7280; opacity: 0.85; font-style: italic; }

  .style-dark .md-callout-note { background: rgba(59,130,246,.12); }
  .style-dark .md-callout-tip { background: rgba(16,185,129,.12); }
  .style-dark .md-callout-important { background: rgba(139,92,246,.12); }
  .style-dark .md-callout-warning,
  .style-dark .md-callout-caution { background: rgba(245,158,11,.12); }
  .style-dark .md-callout-decision { background: rgba(249,115,22,.12); }
  .style-dark .md-callout-insight { background: rgba(14,165,233,.12); }
  .style-dark .md-label-badge { background: #312e81; color: #c7d2fe; }
  .style-dark .md-label-decision { background: #7c2d12; color: #fdba74; }
  .style-dark .md-code-block { background: #2d2d2d; border-color: #3a3a3a; }
  .style-dark .md-code-chrome { background: #252525; border-color: #3a3a3a; }
  .style-dark .md-code-copy:hover { background: #333; border-color: #555; color: #eee; }
  .style-dark .md-code-comment { color: #9ca3af; }
  .style-dark h2 { border-bottom-color: #333; }
  .style-dark h3 { border-left-color: #03dac6; }
  .style-dark strong { color: #f3f4f6; }

  /* decision fence 面板 */
  .md-preview .md-decision-panel {
    margin: 1.5em 0; padding: 16px 18px; border-radius: 10px;
    border: 1px solid #fdba74; background: #fff7ed; border-left: 4px solid #f97316;
  }
  .md-preview .md-decision-badge {
    display: inline-block; font-size: 0.72em; font-weight: 700; letter-spacing: 0.04em;
    padding: 0.15em 0.55em; border-radius: 4px; background: #ffedd5; color: #c2410c; margin-bottom: 0.55em;
  }
  .md-preview .md-decision-title { font-size: 1.08em; font-weight: 700; color: #9a3412; margin-bottom: 0.85em; }
  .md-preview .md-decision-options {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;
  }
  .md-preview .md-decision-option {
    background: #fff; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px 12px 14px;
  }
  .md-preview .md-decision-option-index {
    width: 1.4em; height: 1.4em; border-radius: 999px; background: #ffedd5; color: #c2410c;
    font-size: 0.75em; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;
    margin-bottom: 0.4em;
  }
  .md-preview .md-decision-option-label { font-weight: 700; color: #9a3412; margin-bottom: 0.25em; }
  .md-preview .md-decision-option-detail { font-size: 0.9em; color: #78716c; line-height: 1.45; }
  .md-preview .md-decision-note {
    margin-top: 0.85em; padding-top: 0.7em; border-top: 1px dashed #fdba74;
    font-size: 0.9em; color: #a16207;
  }
  .style-dark .md-decision-panel { background: rgba(249,115,22,.12); border-color: #9a3412; }
  .style-dark .md-decision-option { background: #252525; border-color: #7c2d12; }
  .style-dark .md-decision-title,
  .style-dark .md-decision-option-label { color: #fdba74; }
  .style-dark .md-decision-option-detail { color: #d6d3d1; }
  .style-dark .md-decision-note { border-top-color: #7c2d12; color: #fdba74; }

  /* 脚注 */
  .md-preview .md-fnref { font-size: 0.75em; vertical-align: super; line-height: 0; margin-left: 1px; scroll-margin-top: 12px; }
  .md-preview .md-fnref-link { color: #4f46e5; text-decoration: none; cursor: pointer; }
  .md-preview .md-fnref-link:hover { text-decoration: underline; }
  .md-preview .md-fn-def { color: #4f46e5; text-decoration: none; font-weight: 600; font-size: 0.85em; cursor: pointer; scroll-margin-top: 12px; }
  .md-preview .md-fn-def:hover { text-decoration: underline; }
  .style-dark .md-fnref-link, .style-dark .md-fn-def { color: #a5b4fc; }
`

/* ─── 文件树渲染 ─── */
interface FileTreeProps {
  node: TreeNode
  depth: number
  activePath: string | null
  onOpenFile: (path: string) => void
  onToggleDir: (path: string) => void
  expanded: Set<string>
  mdCount: number
  totalCount: number
}

function FileTree({ node, depth, activePath, onOpenFile, onToggleDir, expanded, mdCount, totalCount }: FileTreeProps) {
  if (node.type === 'dir' && node.path === '') {
    return (
      <div>
        <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
          {mdCount} 个 Markdown · 共 {totalCount} 个文件
        </div>
        {node.children.map((child) => (
          <FileTree
            key={child.path}
            node={child}
            depth={depth + 1}
            activePath={activePath}
            onOpenFile={onOpenFile}
            onToggleDir={onToggleDir}
            expanded={expanded}
            mdCount={mdCount}
            totalCount={totalCount}
          />
        ))}
      </div>
    )
  }
  if (node.type === 'dir') {
    const isExpanded = expanded.has(node.path)
    const childMd = countMd(node)
    return (
      <div>
        <button
          type="button"
          onClick={() => onToggleDir(node.path)}
          className={`w-full flex items-center gap-1.5 px-2 py-1 text-left text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
            childMd === 0 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'
          }`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          <span className="inline-block w-3 shrink-0 text-center">{isExpanded ? '▾' : '▸'}</span>
          <span>📁</span>
          <span className="truncate">{node.name}</span>
          {childMd > 0 && <span className="ml-auto text-[10px] text-gray-400">{childMd}</span>}
        </button>
        {isExpanded && (
          <div>
            {node.children.map((child) => (
              <FileTree
                key={child.path}
                node={child}
                depth={depth + 1}
                activePath={activePath}
                onOpenFile={onOpenFile}
                onToggleDir={onToggleDir}
                expanded={expanded}
                mdCount={mdCount}
                totalCount={totalCount}
              />
            ))}
          </div>
        )}
      </div>
    )
  }
  const isActive = node.path === activePath
  const isMd = isMarkdownPath(node.path)
  return (
    <button
      type="button"
      onClick={() => onOpenFile(node.path)}
      className={`w-full flex items-center gap-1.5 px-2 py-1 text-left text-xs rounded ${
        isActive
          ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
      style={{ paddingLeft: `${depth * 14 + 20}px` }}
    >
      <span className="shrink-0">{isMd ? '📄' : '🗎'}</span>
      <span className="truncate">{node.name}</span>
    </button>
  )
}

function countMd(node: TreeNode): number {
  if (node.type === 'file') return isMarkdownPath(node.path) ? 1 : 0
  return node.children.reduce((sum, c) => sum + countMd(c), 0)
}

/* ─── 主组件 ─── */
export function ArchiveReaderTool() {
  const [view, setView] = useState<ViewState>({ kind: 'empty' })
  const [tree, setTree] = useState<TreeNode | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [activePath, setActivePath] = useState<string | null>(null)
  const [doc, setDoc] = useState<LoadedDoc | null>(null)
  const [finalText, setFinalText] = useState('')
  const [docError, setDocError] = useState('')
  const [ready, setReady] = useState(false)
  const [mermaidReady, setMermaidReady] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 1023.98px)').matches)
  const [treeOpen, setTreeOpen] = useState(() => !window.matchMedia('(max-width: 1023.98px)').matches)
  const [loadError, setLoadError] = useState('')
  const [docCount, setDocCount] = useState(0)
  const [fileCount, setFileCount] = useState(0)
  const [docTitle, setDocTitle] = useState('')

  const zipRef = useRef<JSZip | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const objectUrlsRef = useRef<string[]>([])
  const manifestRef = useRef<ArchiveManifest | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* 手机端判定：跟随 CSS 断点 */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023.98px)')
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
      if (!e.matches) setTreeOpen(true)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  /* 加载渲染引擎 */
  useEffect(() => {
    Promise.all([loadScript(CDN.marked)]).then(() => setReady(true))
    loadScript(CDN.mermaid)
      .then(() => setMermaidReady(true))
      .catch((error) => console.error('Mermaid 加载失败', error))
  }, [])

  /* 释放 object URL（文档切换 / 卸载） */
  const revokeAllObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    objectUrlsRef.current = []
  }, [])

  useEffect(() => {
    return () => revokeAllObjectUrls()
  }, [revokeAllObjectUrls])

  /* ─── 打开文档 ─── */
  const openDoc = useCallback(
    async (path: string) => {
      const zip = zipRef.current
      if (!zip) return
      const file = zip.file(path)
      if (!file) {
        setDocError('文件不存在')
        return
      }
      setDocError('')
      setActivePath(path)
      setDocTitle(path.split('/').pop() || path)
      setLoadError('')
      setFinalText('')

      /* 清理上一个文档的 blob */
      revokeAllObjectUrls()

      try {
        const text = await file.async('string')
        setDoc({ path, text })
      } catch (error) {
        setDocError(error instanceof Error ? error.message : '读取失败')
      }
    },
    [revokeAllObjectUrls],
  )

  /* ─── zip 读取 ─── */
  const openZip = useCallback(
    async (file: File) => {
      setView({ kind: 'loading' })
      setTree(null)
      setActivePath(null)
      setDoc(null)
      setDocError('')
      setLoadError('')
      revokeAllObjectUrls()

      if (!file.name.toLowerCase().endsWith('.zip')) {
        setView({ kind: 'error', message: '请选择 .zip 压缩包' })
        return
      }
      if (file.size > MAX_ZIP_SIZE) {
        setView({ kind: 'error', message: `文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），超过 ${MAX_ZIP_SIZE / 1024 / 1024}MB 上限` })
        return
      }

      try {
        const zip = await JSZip.loadAsync(file)
        zipRef.current = zip

        const entries: Array<{ path: string; isDir: boolean }> = []
        zip.forEach((relativePath, entry) => {
          entries.push({ path: relativePath, isDir: entry.dir })
        })

        const manifest = buildManifest(entries)
        manifestRef.current = manifest

        const mdFiles = manifest.files.filter((f) => f.isMarkdown)
        setDocCount(mdFiles.length)
        setFileCount(manifest.files.length)

        /* 默认展开第一层目录 */
        const firstLevel = new Set<string>()
        for (const d of manifest.dirs) {
          const parts = d.split('/')
          if (parts.length === 1) firstLevel.add(d)
        }
        setExpanded(firstLevel)

        setTree(buildTree(manifest.files, manifest.dirs))
        setView({ kind: 'tree', manifest })

        /* 自动打开第一个 markdown */
        if (mdFiles.length > 0) {
          void openDoc(mdFiles[0].path)
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : '无法读取压缩包'
        setView({ kind: 'error', message: msg })
        console.error('解压失败', error)
      }
    },
    [revokeAllObjectUrls, openDoc],
  )

  /* ─── 渲染 ─── */
  const rendered = useMemo(() => {
    const source = finalText || doc?.text || ''
    if (!ready || !source) return null
    try {
      let parsed = enrichMarkdownHtml(upgradeFenceBlocks(window.marked.parse(normalizeFootnoteDefs(source)) as string))
      let headingIndex = 0
      parsed = parsed.replace(/<h([1-6])([^>]*)>(.*?)<\/h[1-6]>/gi, (_m, level, attrs, content) => {
        const id = `toc-heading-${headingIndex++}`
        return `<h${level}${attrs} id="${id}">${content}</h${level}>`
      })
      return sanitizeMarkdownHtml(parsed)
    } catch {
      return '<p style="color:red">Markdown 解析错误</p>'
    }
  }, [ready, doc, finalText])

  /* 打开文档时解析相对引用 → 加载图片 / 重写链接 */
  useEffect(() => {
    if (!doc || !ready) return

    const zip = zipRef.current
    if (!zip) return

    let cancelled = false

    const doLoad = async () => {
      try {
        const res = await loadLinkedTargets(doc.path, doc.text, {
          readText: async (p) => {
            const f = zip.file(p)
            if (!f) throw new Error('文件不存在')
            return f.async('string')
          },
          readImage: async (p) => {
            const f = zip.file(p)
            if (!f) return null
            return f.async('blob')
          },
        })

        if (cancelled) return

        /* 图片 blob → object URL */
        const refs: ImageRef[] = res.images.map((img) => {
          const url = img.url!
          objectUrlsRef.current.push(url)
          return { path: img.path, url }
        })

        const mdDocs: LoadDocResult[] = res.docs
        setLoadError(
          res.errors.length > 0 ? res.errors.map((e) => `${e.path}：${e.error}`).join('；') : '',
        )

        /* 重写 markdown 中的链接：图片 → blob URL；子文档 → 哨兵锚点；其他文件 → 提示 */
        const imageUrls = new Map<string, string>()
        for (const ref of refs) imageUrls.set(ref.path, ref.url)
        const docTargets = new Map<string, string>()
        for (const d of mdDocs) docTargets.set(d.path, d.path)
        const fileNotes = new Map<string, string>()
        for (const s of res.skipped) fileNotes.set(s.path, `${s.path}（${s.reason}）`)

        const { out } = rewriteMarkdownLinks(doc.text, {
          imageUrls,
          docTargets,
          fileNotes,
          rootPath: doc.path,
        })

        if (cancelled) return
        setFinalText(out)
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : '加载失败')
        }
      }
    }

    void doLoad()
    return () => { cancelled = true }
  }, [doc, ready])

  /* 渲染 Mermaid */
  useEffect(() => {
    if (!ready || !mermaidReady || !rendered || !window.mermaid || !previewRef.current) return
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'default',
    })
    const nodes: HTMLElement[] = Array.from(previewRef.current.querySelectorAll<HTMLElement>('.mermaid'))
    if (nodes.length === 0) return
    window.mermaid
      .run({ nodes })
      .catch((error) => {
        console.error('Mermaid 渲染失败', error)
        nodes.forEach((node) => {
          node.classList.add('mermaid-error')
          node.textContent = `Mermaid 渲染失败：${error instanceof Error ? error.message : String(error)}`
        })
      })
  }, [rendered, ready, mermaidReady])

  /* 点击委托：站内文档 / 图片 / 哨兵锚点 / 站外链接 */
  useEffect(() => {
    const root = previewRef.current
    if (!root || !rendered) return

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a') as HTMLAnchorElement | null
      if (!a || !root.contains(a)) return
      const href = a.getAttribute('href') || ''

      /* 哨兵锚点：站内文档 / 站内文件提示 */
      const ad = decodeAdPath(href)
      if (ad) {
        e.preventDefault()
        if (ad.role === 'doc') {
          void openDoc(ad.path)
        } else {
          setLoadError(`该文件不是 Markdown 文档（${ad.path}），请在左侧文件树中查看`)
        }
        return
      }

      /* 同页锚点（脚注等） */
      if (href.startsWith('#')) {
        e.preventDefault()
        const id = href.slice(1)
        const target = root.querySelector(`#${CSS.escape(id)}`)
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }

      /* blob 图片：新标签页打开 */
      if (href.startsWith('blob:')) {
        e.preventDefault()
        window.open(href, '_blank', 'noopener,noreferrer')
        return
      }

      /* 站外链接：交还浏览器（sanitize 已加 target/rel） */
    }
    root.addEventListener('click', onClick)
    return () => root.removeEventListener('click', onClick)
  }, [rendered, openDoc])

  /* 目录折叠 */
  const toggleDir = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  /* 导出当前文档 */
  const exportDoc = useCallback(async () => {
    if (!doc) return
    try {
      const blob = new Blob([doc.text], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = buildDownloadName(doc.path)
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '导出失败')
    }
  }, [doc])

  /* ─── 渲染 ─── */
  return (
    <>
      <style>{BASE_PREVIEW_CSS}</style>
      <ToolLayout
      title="文档集阅读器"
      description="上传 .zip 压缩包，在浏览器内解压并浏览其中全部 Markdown 文档（含子目录），数据不出浏览器。"
      designNotes={[
        '为什么只支持 zip：浏览器无法解压加密的 .7z（AES-256 + 文件名加密无纯 JS 实现）。若需加密传输，请用「安全压缩脚本」的 7z 包；阅读用普通 zip 包即可。',
        '解压全部在浏览器内存中进行，文件不上传服务器；关闭页面即清除。',
        '阅读器复用了 Markdown 阅读器的渲染管线（Callout / 决策面板 / Mermaid / 代码高亮等），同一份文档在两个工具里观感一致。',
        '压缩包内的相对链接与图片引用会按文档所在目录自动解析：图片直接显示，指向其他 md 的链接可点击跳转。',
        '安全防护：解压炸弹（超 50 万条目或 100MB）与路径穿越（../）会直接拒绝，避免恶意包拖垮浏览器。',
      ]}
    >
      <div className="space-y-6">
        {/* 上传区 */}
        <div
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-mech p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files?.[0]
            if (file) void openZip(file)
          }}
        >
          <div className="text-4xl mb-3">🗜️</div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            拖拽 .zip 到此处，或点击选择文件
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            解压与阅读全部在本机浏览器内完成，不会上传到任何服务器
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTS}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void openZip(file)
              e.target.value = ''
            }}
          />
        </div>

        {view.kind === 'error' && (
          <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-mech text-sm text-rose-700 dark:text-rose-300">
            {view.message}
          </div>
        )}

        {/* 已打开：文件树 + 预览 */}
        {view.kind === 'tree' && tree && (
          <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-320px)] min-h-[420px]">
            {/* 文件树 */}
            <div
              className={`${
                isMobile && !treeOpen ? 'hidden' : ''
              } lg:w-64 shrink-0 border-2 border-gray-200 dark:border-gray-700 rounded-mech overflow-y-auto bg-gray-50 dark:bg-gray-900 p-2`}
            >
              <FileTree
                node={tree}
                depth={0}
                activePath={activePath}
                onOpenFile={(p) => void openDoc(p)}
                onToggleDir={toggleDir}
                expanded={expanded}
                mdCount={docCount}
                totalCount={fileCount}
              />
            </div>

            {/* 预览 */}
            <div className="flex-1 min-w-0 border-2 border-gray-200 dark:border-gray-700 rounded-mech overflow-hidden flex flex-col">
              {/* 工具栏 */}
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
                <button
                  type="button"
                  onClick={() => setTreeOpen((v) => !v)}
                  className="lg:hidden px-2.5 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  📂 文件树
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1" title={docTitle}>
                  {docTitle}
                </span>
                <button
                  type="button"
                  onClick={() => void exportDoc()}
                  disabled={!doc}
                  className="px-2.5 py-1 text-xs font-medium bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  导出当前文档
                </button>
              </div>

              {/* 内容 */}
              <div className="flex-1 overflow-auto relative">
                {docError ? (
                  <div className="p-6 text-sm text-rose-600 dark:text-rose-400">{docError}</div>
                ) : loadError ? (
                  <div className="p-6 text-sm text-amber-600 dark:text-amber-400">{loadError}</div>
                ) : !ready ? (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">加载渲染引擎中...</div>
                ) : (
                  <div
                    ref={previewRef}
                    className="md-preview min-h-full"
                    style={{ lineHeight: 1.7, minHeight: '100%' }}
                    dangerouslySetInnerHTML={{ __html: rendered ?? '' }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      </ToolLayout>
    </>
  )
}
