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
