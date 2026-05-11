import { useEffect, useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { promptPresets } from './prompts'

const MARKED_CDN = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js'

type MarkedWindow = Window & {
  marked?: {
    parse: (markdown: string) => string | Promise<string>
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') resolve()
      else {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true })
      }
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.loaded = 'false'
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sanitizeHtml(html: string) {
  const template = document.createElement('template')
  template.innerHTML = html

  template.content.querySelectorAll('script, style, iframe, object, embed').forEach((node) => node.remove())
  template.content.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()
      const isUnsafeUrl = (name === 'href' || name === 'src') && value.startsWith('javascript:')

      if (name.startsWith('on') || isUnsafeUrl) node.removeAttribute(attribute.name)
    })
  })

  return template.innerHTML
}

function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  return Promise.resolve()
}

export function PromptGalleryTool() {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [selectedId, setSelectedId] = useState(promptPresets[0]?.id ?? '')
  const [draft, setDraft] = useState(promptPresets[0]?.content ?? '')
  const [previewHtml, setPreviewHtml] = useState('')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  const categories = useMemo(() => ['全部', ...Array.from(new Set(promptPresets.map((prompt) => prompt.category)))], [])

  const filteredPrompts = useMemo(() => {
    const keyword = query.trim().toLowerCase()

    return promptPresets.filter((prompt) => {
      const matchesCategory = selectedCategory === '全部' || prompt.category === selectedCategory
      const matchesKeyword = keyword === '' || [
        prompt.title,
        prompt.description,
        prompt.category,
        prompt.tags.join(' '),
        prompt.content,
      ].join(' ').toLowerCase().includes(keyword)

      return matchesCategory && matchesKeyword
    })
  }, [query, selectedCategory])

  const selectedPrompt = useMemo(
    () => promptPresets.find((prompt) => prompt.id === selectedId) ?? promptPresets[0],
    [selectedId],
  )

  useEffect(() => {
    setDraft(selectedPrompt?.content ?? '')
    setCopyStatus('idle')
  }, [selectedPrompt?.id])

  useEffect(() => {
    let cancelled = false

    async function renderMarkdown() {
      try {
        await loadScript(MARKED_CDN)
        const marked = (window as MarkedWindow).marked
        const html = marked ? await marked.parse(draft) : `<pre>${escapeHtml(draft)}</pre>`
        if (!cancelled) setPreviewHtml(sanitizeHtml(String(html)))
      } catch {
        if (!cancelled) setPreviewHtml(`<pre>${escapeHtml(draft)}</pre>`)
      }
    }

    renderMarkdown()
    return () => {
      cancelled = true
    }
  }, [draft])

  useEffect(() => {
    if (copyStatus === 'idle') return
    const timer = window.setTimeout(() => setCopyStatus('idle'), 1600)
    return () => window.clearTimeout(timer)
  }, [copyStatus])

  async function handleCopy() {
    try {
      await copyText(draft)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
  }

  if (!selectedPrompt) {
    return (
      <ToolLayout title="提示词展柜" description="浏览、预览并复制常用提示词预设。">
        <div className="text-gray-600">还没有配置提示词。</div>
      </ToolLayout>
    )
  }

  return (
    <ToolLayout
      title="提示词展柜"
      description="浏览、搜索、临时编辑并复制写死在配置里的常用提示词预设。"
      designNotes={[
        '左侧只展示名称与简单介绍，避免列表暴露完整提示词。',
        '提示词内容来自静态配置，不提供新增、删除或持久化保存。',
        '右侧可临时编辑，复制当前编辑后的 Markdown 内容。',
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700" htmlFor="prompt-search">
              搜索提示词
            </label>
            <input
              id="prompt-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题、简介、标签或正文..."
              className="w-full border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              style={{ borderRadius: '2px' }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedCategory === category
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                }`}
                style={{ borderRadius: '2px' }}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="text-xs font-medium text-gray-500">找到 {filteredPrompts.length} 条预设</div>

          <div className="space-y-3">
            {filteredPrompts.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                onClick={() => setSelectedId(prompt.id)}
                className={`w-full border-2 p-4 text-left transition-all ${
                  selectedPrompt.id === prompt.id
                    ? 'border-blue-500 bg-blue-50 shadow-subtle'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-subtle'
                }`}
                style={{ borderRadius: '2px' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{prompt.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">{prompt.description}</p>
                  </div>
                  <span className="shrink-0 border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-500">
                    {prompt.category}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {prompt.tags.map((tag) => (
                    <span key={tag} className="bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                      #{tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {filteredPrompts.length === 0 && (
            <div className="border-2 border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
              没有找到匹配的提示词。
            </div>
          )}
        </aside>

        <section className="min-w-0 space-y-5">
          <div className="flex flex-col gap-4 border-2 border-gray-200 bg-gray-50 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold text-gray-900">{selectedPrompt.title}</h3>
                <span className="border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-500">
                  {selectedPrompt.category}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-gray-600">{selectedPrompt.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedPrompt.tags.map((tag) => (
                  <span key={tag} className="bg-white px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDraft(selectedPrompt.content)}
                className="border-2 border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900"
                style={{ borderRadius: '2px' }}
              >
                重置修改
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="border-2 border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-blue-700 hover:bg-blue-700"
                style={{ borderRadius: '2px' }}
              >
                {copyStatus === 'copied' ? '已复制' : copyStatus === 'failed' ? '复制失败' : '复制当前内容'}
              </button>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="min-w-0 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900">Markdown 预览</h4>
                <span className="text-xs text-gray-500">渲染后效果</span>
              </div>
              <article
                className="prose prose-slate max-w-none border-2 border-gray-200 bg-white p-5 prose-headings:scroll-mt-20 prose-pre:bg-gray-950 prose-pre:text-gray-50"
                style={{ borderRadius: '2px' }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>

            <div className="min-w-0 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900">临时编辑</h4>
                <span className="text-xs text-gray-500">不会保存到配置</span>
              </div>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                spellCheck={false}
                className="min-h-[560px] w-full resize-y border-2 border-gray-200 bg-white p-4 font-mono text-sm leading-6 text-gray-900 focus:border-blue-500 focus:outline-none"
                style={{ borderRadius: '2px' }}
              />
            </div>
          </div>
        </section>
      </div>
    </ToolLayout>
  )
}
