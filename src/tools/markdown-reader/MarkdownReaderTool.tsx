import { useCallback, useEffect, useRef, useState } from 'react'

/* ─── marked CDN 动态加载 ─── */
declare global {
  interface Window {
    marked: { parse: (md: string) => string }
    html2canvas: (el: HTMLElement, opts?: any) => Promise<HTMLCanvasElement>
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

export function MarkdownReaderTool() {
  const [md, setMd] = useState(DEFAULT_MD)
  const [style, setStyle] = useState<StyleKey>('business')
  const [html, setHtml] = useState('')
  const [ready, setReady] = useState(false)
  const [exporting, setExporting] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /* 加载外部脚本 */
  useEffect(() => {
    Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js'),
      loadScript('https://html2canvas.hertzen.com/dist/html2canvas.min.js'),
    ]).then(() => setReady(true))
  }, [])

  /* 渲染 Markdown */
  useEffect(() => {
    if (!ready) return
    try {
      setHtml(window.marked.parse(md))
    } catch {
      setHtml('<p style="color:red">Markdown 解析错误</p>')
    }
  }, [md, ready])

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
    <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* 样式注入 */}
      <style>{Object.values(STYLE_CSS).join('\n')}</style>

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
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* 编辑器 */}
        <div className="flex-1 min-w-0 min-h-0">
          <textarea
            ref={textareaRef}
            value={md}
            onChange={(e) => setMd(e.target.value)}
            className="w-full h-full resize-none p-4 text-sm leading-relaxed border-r border-gray-200 bg-white focus:outline-none font-mono"
            placeholder="在此输入 Markdown..."
          />
        </div>

        {/* 预览 */}
        <div className="flex-1 min-w-0 min-h-0 overflow-auto">
          {!ready ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">加载渲染引擎中...</div>
          ) : (
            <div
              ref={previewRef}
              className={`md-preview style-${style}`}
              style={{ lineHeight: 1.8, minHeight: '100%' }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
