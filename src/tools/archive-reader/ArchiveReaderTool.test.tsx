/**
 * ArchiveReaderTool 组件集成测试：
 * 用真实 JSZip 在内存里构造 zip → 模拟用户选择文件 → 验证解压、文件树、渲染链路。
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act } from 'react'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import JSZip from 'jszip'
import { ArchiveReaderTool } from './ArchiveReaderTool'

/* marked 需要真实可用（CDN 在 jsdom 里不可用），这里 mock 一个最小实现 */
;(window as { marked?: { parse: (md: string) => string } }).marked = {
  parse: (md: string) => {
    return md
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^> (.*)$/gm, '<blockquote><p>$1</p></blockquote>')
      .replace(/^```(\w+)\n([\s\S]*?)```$/gm, '<pre><code class="language-$1">$2</code></pre>')
      .replace(/\n\n/g, '</p><p>')
      .trim()
  },
}

/* mock loadScript：立即 resolve，让 ready 变为 true（CDN 在 jsdom 不可用） */
vi.mock('../../utils/loadScript', () => ({
  CDN: { marked: { src: 'marked' }, mermaid: { src: 'mermaid' } },
  loadScript: () => Promise.resolve(),
}))

/* URL.createObjectURL 在 jsdom 缺失 */
if (!URL.createObjectURL) {
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: () => 'blob:mock' })
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: () => {} })
}

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

async function makeZip(files: Record<string, string | Uint8Array>): Promise<File> {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  return new File([blob], 'docs.zip', { type: 'application/zip' })
}

async function renderAndOpen(files: Record<string, string | Uint8Array>) {
  mockMatchMedia(false)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(<ArchiveReaderTool />)
  })

  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  expect(input, 'file input should exist').toBeTruthy()

  const file = await makeZip(files)
  await act(async () => {
    /* React 的 onChange 监听 change 事件；input.files 只读，用 defineProperty 注入 */
    Object.defineProperty(input!, 'files', { value: [file], configurable: true })
    input!.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
  return { container, root }
}

async function flushRenders() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
}

describe('ArchiveReaderTool 集成', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('上传 zip 后展示文件树并渲染第一个 markdown', async () => {
    const { container, root } = await renderAndOpen({
      'docs/a.md': '# 文档 A\n\n正文内容',
      'docs/b.md': '# 文档 B',
    })

    await flushRenders()

    /* 文件树出现，目录可折叠 */
    const tree = container.querySelector('.md-preview') // 渲染区存在
    expect(tree).toBeTruthy()

    /* 渲染出标题 */
    const h1 = container.querySelector('.md-preview h1')
    expect(h1?.textContent).toContain('文档 A')

    /* 目录条目与文件条目都在 */
    const buttons = Array.from(container.querySelectorAll('button')).map((b) => b.textContent ?? '')
    expect(buttons.some((t) => t.includes('docs'))).toBe(true)
    expect(buttons.some((t) => t.includes('a.md'))).toBe(true)
    expect(buttons.some((t) => t.includes('b.md'))).toBe(true)

    act(() => root.unmount())
  })

  it('相对图片引用被重写为 blob URL', async () => {
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]) // 最小 PNG 头
    const { container, root } = await renderAndOpen({
      'docs/a.md': '# A\n\n![图](img.png)',
      'docs/img.png': png,
    })

    await flushRenders()

    const img = container.querySelector<HTMLImageElement>('.md-preview img')
    expect(img, 'img should be rendered').toBeTruthy()
    expect(img!.src.startsWith('blob:')).toBe(true)

    act(() => root.unmount())
  })

  it('指向其他 md 的相对链接生成哨兵锚点，点击后切换文档', async () => {
    const { container, root } = await renderAndOpen({
      'docs/a.md': '# 文档 A\n\n[去 B](b.md)',
      'docs/b.md': '# 文档 B',
    })

    await flushRenders()

    const link = container.querySelector<HTMLAnchorElement>('.md-preview a')
    expect(link, 'link should exist').toBeTruthy()
    expect(link!.getAttribute('href')?.startsWith('#ad:')).toBe(true)

    await act(async () => {
      link!.click()
    })
    await flushRenders()

    expect(container.querySelector('.md-preview h1')?.textContent).toContain('文档 B')

    act(() => root.unmount())
  })
})
