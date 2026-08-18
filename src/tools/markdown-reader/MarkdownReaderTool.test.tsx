/**
 * 手机端单栏视图切换的回归测试：
 * 编辑 / 预览二选一显示（display:none 隐藏而非卸载），切换不丢状态。
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act } from 'react'

/* React 18 在 jsdom 下需要显式声明 act 环境，否则每次 act 都告警 */
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { MarkdownReaderTool } from './MarkdownReaderTool'

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

async function renderMobile() {
  mockMatchMedia(true)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(<MarkdownReaderTool />)
  })
  return { container, root }
}

/** 编辑器容器是否可见：父级无 hidden 类 */
function editorVisible(container: HTMLElement): boolean {
  const ta = container.querySelector('textarea')
  expect(ta, 'textarea should exist').toBeTruthy()
  return !ta!.parentElement!.classList.contains('hidden')
}

/** 预览容器（previewWrapRef 自身）是否可见：上一层无 hidden 类 */
function previewVisible(container: HTMLElement): boolean {
  const wrap = container.querySelector('.md-reading-progress')?.parentElement
  expect(wrap, 'preview wrap should exist').toBeTruthy()
  return !wrap!.parentElement!.classList.contains('hidden')
}

function clickButton(container: HTMLElement, text: string) {
  const btn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes(text))
  expect(btn, `button containing "${text}"`).toBeTruthy()
  act(() => btn!.click())
}

describe('MarkdownReaderTool 手机端视图切换', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('默认编辑视图：编辑器可见、预览隐藏', async () => {
    const { container, root } = await renderMobile()
    expect(editorVisible(container)).toBe(true)
    expect(previewVisible(container)).toBe(false)
    act(() => root.unmount())
  })

  it('切到预览视图：预览可见、编辑器隐藏；再切回编辑：恢复', async () => {
    const { container, root } = await renderMobile()
    clickButton(container, '👁️ 预览')
    expect(previewVisible(container)).toBe(true)
    expect(editorVisible(container)).toBe(false)
    clickButton(container, '✏️ 编辑')
    expect(editorVisible(container)).toBe(true)
    expect(previewVisible(container)).toBe(false)
    act(() => root.unmount())
  })

  it('桌面端（宽屏）下两个面板始终同时显示', async () => {
    mockMatchMedia(false)
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(<MarkdownReaderTool />)
    })
    expect(editorVisible(container)).toBe(true)
    expect(previewVisible(container)).toBe(true)
    act(() => root.unmount())
  })
})

describe('MarkdownReaderTool 文档历史', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  function renderDesktop() {
    mockMatchMedia(false)
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    return { container, root }
  }

  function setTextarea(container: HTMLElement, value: string) {
    const ta = container.querySelector('textarea')!
    // React 受控组件用原生 setter 绕过 value tracker，onChange 才会触发
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    act(() => {
      setter.call(ta, value)
      ta.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  function historySelect(container: HTMLElement): HTMLSelectElement | null {
    return Array.from(container.querySelectorAll('select')).find((s) =>
      s.closest('label')?.textContent?.includes('文档历史'),
    ) ?? null
  }

  function historyOptionCount(container: HTMLElement): number {
    const sel = historySelect(container)
    return sel ? sel.querySelectorAll('option').length : 0
  }

  it('迁移：旧单槽草稿自动成为当前文档', async () => {
    localStorage.setItem('md-reader:content', '# 旧草稿')
    const { container, root } = renderDesktop()
    await act(async () => {
      root.render(<MarkdownReaderTool />)
    })
    expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toBe('# 旧草稿')
    expect(historyOptionCount(container)).toBe(1) // 只有「当前文档」
    act(() => root.unmount())
  })

  it('粘贴新内容后旧内容存入历史，可切回', async () => {
    const { container, root } = renderDesktop()
    await act(async () => {
      root.render(<MarkdownReaderTool />)
    })
    // 粘贴一段新内容（onPaste 快照旧内容，input 更新内容）
    const ta = container.querySelector('textarea')!
    act(() => {
      ta.dispatchEvent(new Event('paste', { bubbles: true }))
    })
    setTextarea(container, '# 新文档')
    expect(historyOptionCount(container)).toBe(2)

    // 切回历史项
    const sel = historySelect(container)!
    act(() => {
      sel.value = sel.querySelectorAll('option')[1].value
      sel.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect((container.querySelector('textarea') as HTMLTextAreaElement).value).not.toBe('# 新文档')
    expect(historyOptionCount(container)).toBe(2)
    act(() => root.unmount())
  })
})
