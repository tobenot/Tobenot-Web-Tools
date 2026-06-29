import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { getHashLocation } from '../../utils/hash'


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

interface ReadingProgress {
  scrollTop: number
  scrollRatio: number
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

function clampReadingRatio(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function loadReadingProgressFromStorage(): ReadingProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_READING_PROGRESS)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ReadingProgress>
    const scrollTop = Number(parsed.scrollTop)
    const scrollRatio = Number(parsed.scrollRatio)
    return {
      scrollTop: Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0,
      scrollRatio: clampReadingRatio(scrollRatio),
    }
  } catch { /* ignore */ }
  return null
}

function getScrollRatio(element: HTMLElement): number {
  const max = element.scrollHeight - element.clientHeight
  return max > 0 ? clampReadingRatio(element.scrollTop / max) : 0
}

function getScrollTopFromProgress(element: HTMLElement, progress: ReadingProgress): number {
  const max = Math.max(0, element.scrollHeight - element.clientHeight)
  const scrollTop = max > 0 ? progress.scrollRatio * max : progress.scrollTop
  return Math.min(max, Math.max(0, scrollTop))
}

/* ─── Gist 分享 ─── */
/*
 * 大文档无法塞进 URL，改为把正文存到 GitHub Secret Gist，链接里只带 gist id。
 * - 分享者需要一个带 `gist` 权限的 GitHub Token（存于浏览器本地）。
 * - 访客只读，无需 token 或账号。
 */
const STORAGE_KEY_GIST_TOKEN = 'md-reader:gist-token'
const SHARE_GIST_PARAM = 'gist'
const SHARE_STYLE_PARAM = 'style'
const GIST_FILENAME = 'document.md'
const GIST_TOKEN_HELP_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=Mecha%20Tools%20Markdown%20Reader'
const GIST_TOKEN_HELP_PATH = 'GitHub → Settings → Developer settings → Personal access tokens → Generate new token（classic）'

/** Token 创建页 URL 各参数说明，便于用户核对链接里是否夹带个人信息 */
const GIST_TOKEN_URL_PARTS = [
  {
    part: 'https://github.com',
    meaning: 'GitHub 官方域名。请确认地址栏里确实是 github.com，而不是形似域名。',
  },
  {
    part: '/settings/tokens/new',
    meaning: 'GitHub 账号设置里的「新建 Token」页面路径。需要你先登录 GitHub 才能访问，本站无法替你打开或读取该页。',
  },
  {
    part: 'scopes=gist',
    meaning: '页面表单参数：预勾选 gist 权限（仅允许创建/管理 Gist）。不含你的用户名、邮箱或任何身份信息。',
  },
  {
    part: 'description=Mecha Tools Markdown Reader',
    meaning: '页面表单参数：预填 Token 的备注名称，方便你区分用途。只是固定文案，不含你的个人信息；你也可以在 GitHub 页面上自行修改或留空。',
  },
] as const

/** 分享链接 URL 参数说明 */
const SHARE_LINK_URL_PARTS = [
  {
    part: 'gist=xxxxxxxx',
    meaning: 'GitHub 上该篇文档的编号（Gist ID）。访客打开链接后，浏览器会拿这个 ID 去 api.github.com 拉取正文。链接里只有编号，不含文档内容本身。',
  },
  {
    part: 'style=business',
    meaning: '阅读器排版风格（如 business、dark 等）。只是展示偏好，不含个人信息。',
  },
] as const

/** 分享流程原理说明 */
const SHARE_PRINCIPLE_STEPS = [
  {
    step: '①',
    title: '你在本页点击「上传并生成链接」',
    detail: '浏览器读取当前 Markdown 正文，以及你本机保存的 GitHub Token。',
  },
  {
    step: '②',
    title: '浏览器直接请求 GitHub 官方 API（api.github.com）',
    detail: '请求从你的电脑发出，不经过本站服务器。Token 只用于向 GitHub 证明「你有权在该账号下创建 Gist」。',
  },
  {
    step: '③',
    title: '正文存入你 GitHub 账号下的 Secret Gist',
    detail: '文档托管在 GitHub，不在本站。Secret Gist 不会公开列出，但拿到链接的人能查看。',
  },
  {
    step: '④',
    title: '生成带 Gist 编号的短链接',
    detail: '链接形如 #markdown-reader?gist=编号&style=风格。正文不在 URL 里，所以大文档也不会撑爆地址栏。',
  },
  {
    step: '⑤',
    title: '访客打开链接时，浏览器再从 GitHub 拉取正文并渲染',
    detail: '访客无需 Token、无需 GitHub 账号。本站同样不参与存储或中转文档内容。',
  },
] as const

/** GitHub Gist 限额说明（依据 GitHub 官方文档） */
const GIST_LIMIT_NOTES = [
  {
    title: '单文件大小',
    detail: 'GitHub 允许 Gist 单文件较大，但通过 API/网页读取时：超过约 1 MB 会走 raw 地址拉取；超过约 10 MB 则无法完整在线读取。建议单篇 Markdown 控制在 10 MB 以内。',
  },
  {
    title: '数量与归属',
    detail: '每次点分享都会在你 GitHub 账号下新建一个 Gist（不会覆盖旧的）。Gist 归你账号所有，GitHub 未公开明确的「最多多少个」硬上限，但会随分享次数累积。',
  },
  {
    title: 'API 速率',
    detail: '带 Token 调用 GitHub API 约 5000 次/小时。分享一次 ≈ 1 次创建请求，正常使用很难触顶。',
  },
  {
    title: 'Secret 的含义',
    detail: 'Secret Gist 只是「不公开列出、不可搜索」，并非加密。任何拿到链接或 Gist 编号的人都能查看，请勿存放密码、密钥等敏感信息。',
  },
] as const

/** 删除已分享 Gist 的步骤 */
const GIST_DELETE_STEPS = [
  '用创建该 Gist 的 GitHub 账号登录（需与 Token 所属账号一致）。',
  '在浏览器地址栏打开 gist.github.com，进入你的 Gist 列表；或打开下方生成结果里给出的 Gist 页面地址。',
  '找到对应 Gist（描述通常为 Shared via Mecha Tools Markdown Reader，可按时间辨认）。',
  '进入该 Gist 页面，点击右上角 Delete / Delete gist 确认删除。',
  '删除后，之前发出去的本站分享链接将无法再加载文档（GitHub 返回 404）。链接本身无法「远程作废」，只能靠删除源 Gist。',
] as const

interface CreatedGist {
  id: string
  htmlUrl: string
}

function maskGistToken(token: string): string {
  if (token.length <= 4) return '****'
  return `…${token.slice(-4)}`
}

function isStyleKey(value: string | null): value is StyleKey {
  return value !== null && STYLE_OPTIONS.some((opt) => opt.key === value)
}

function loadGistToken(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_GIST_TOKEN) ?? ''
  } catch {
    return ''
  }
}

interface SharedGistRef {
  id: string
  style?: StyleKey
}

function readSharedGistRef(): SharedGistRef | null {
  try {
    const { params } = getHashLocation()
    const id = params.get(SHARE_GIST_PARAM)
    if (!id) return null
    const styleParam = params.get(SHARE_STYLE_PARAM)
    return { id, style: isStyleKey(styleParam) ? styleParam : undefined }
  } catch {
    return null
  }
}

async function createSharedGist(md: string, token: string): Promise<CreatedGist> {
  const res = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: 'Shared via Mecha Tools Markdown Reader',
      public: false,
      files: { [GIST_FILENAME]: { content: md } },
    }),
  })
  if (!res.ok) {
    if (res.status === 401) throw new Error('Token 无效或已过期，请重新填写')
    if (res.status === 403 || res.status === 404) throw new Error('Token 缺少 gist 权限，请重新生成并勾选 gist')
    if (res.status === 422) throw new Error('文档可能超过 GitHub Gist 单文件大小限制，请缩短后重试')
    throw new Error(`创建失败（HTTP ${res.status}）`)
  }
  const data = (await res.json()) as { id?: string; html_url?: string }
  if (!data.id) throw new Error('GitHub 未返回 gist id')
  return {
    id: data.id,
    htmlUrl: data.html_url ?? `https://gist.github.com/${data.id}`,
  }
}

interface GistFile {
  filename?: string
  content?: string
  truncated?: boolean
  raw_url?: string
}

async function fetchSharedGistMarkdown(id: string): Promise<string> {
  const res = await fetch(`https://api.github.com/gists/${id}`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) {
    if (res.status === 404) throw new Error('找不到该文档，链接可能已失效或被删除')
    throw new Error(`加载失败（HTTP ${res.status}）`)
  }
  const data = (await res.json()) as { files?: Record<string, GistFile> }
  const files = Object.values(data.files ?? {})
  if (files.length === 0) throw new Error('该 gist 为空')
  const file = files.find((f) => f.filename === GIST_FILENAME) ?? files.find((f) => f.filename?.endsWith('.md')) ?? files[0]
  if (file.truncated && file.raw_url) {
    const rawRes = await fetch(file.raw_url)
    if (!rawRes.ok) throw new Error(`加载完整内容失败（HTTP ${rawRes.status}）`)
    return await rawRes.text()
  }
  return file.content ?? ''
}

function buildGistShareUrl(id: string, style: StyleKey): string {
  const params = new URLSearchParams()
  params.set(SHARE_GIST_PARAM, id)
  params.set(SHARE_STYLE_PARAM, style)
  const { origin, pathname } = window.location
  return `${origin}${pathname}#markdown-reader?${params.toString()}`
}

const INITIAL_SHARED_GIST = readSharedGistRef()


export function MarkdownReaderTool() {
  const [md, setMd] = useState(() => loadFromStorage(STORAGE_KEY_MD, DEFAULT_MD))
  const [style, setStyle] = useState<StyleKey>(() => INITIAL_SHARED_GIST?.style ?? loadFromStorage<StyleKey>(STORAGE_KEY_STYLE, 'business'))
  const [html, setHtml] = useState('')

  /* 分享 / 阅读模式（Gist） */
  const [readMode, setReadMode] = useState(() => INITIAL_SHARED_GIST !== null)
  const [gistLoading, setGistLoading] = useState(() => INITIAL_SHARED_GIST !== null)
  const [gistError, setGistError] = useState('')
  const [shareCreating, setShareCreating] = useState(false)
  const [shareError, setShareError] = useState('')
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [gistToken, setGistToken] = useState(loadGistToken)
  const [tokenInput, setTokenInput] = useState('')
  const [tokenUrlCopied, setTokenUrlCopied] = useState(false)
  const [generatedShareUrl, setGeneratedShareUrl] = useState('')
  const [generatedGistHtmlUrl, setGeneratedGistHtmlUrl] = useState('')
  const [generatedGistId, setGeneratedGistId] = useState('')
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [gistPageUrlCopied, setGistPageUrlCopied] = useState(false)
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
  const readingProgressSaveTimerRef = useRef<number | null>(null)
  const readingProgressRestoredRef = useRef(false)


  /* 自动保存到 localStorage（防抖 500ms）；阅读模式（查看他人分享）下不保存，避免覆盖本机草稿 */
  const saveTimerRef = useRef<number | null>(null)
  useEffect(() => {
    if (readMode) return
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_MD, md)
      } catch { /* quota exceeded or unavailable */ }
    }, 500)
    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    }
  }, [md, readMode])

  /* 通过分享链接打开时，拉取 gist 内容 */
  useEffect(() => {
    if (!INITIAL_SHARED_GIST) return
    let cancelled = false
    setGistLoading(true)
    setGistError('')
    fetchSharedGistMarkdown(INITIAL_SHARED_GIST.id)
      .then((content) => {
        if (cancelled) return
        setMd(content)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setGistError(error instanceof Error ? error.message : '加载失败')
      })
      .finally(() => {
        if (!cancelled) setGistLoading(false)
      })
    return () => { cancelled = true }
  }, [])

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

  const saveReadingProgressNow = useCallback(() => {
    const container = previewWrapRef.current
    if (!container) return
    const progress: ReadingProgress = {
      scrollTop: container.scrollTop,
      scrollRatio: getScrollRatio(container),
    }
    try {
      localStorage.setItem(STORAGE_KEY_READING_PROGRESS, JSON.stringify(progress))
    } catch { /* ignore */ }
  }, [])

  const saveReadingProgress = useCallback(() => {
    if (!readingProgressRestoredRef.current) return
    if (readingProgressSaveTimerRef.current !== null) {
      window.clearTimeout(readingProgressSaveTimerRef.current)
    }
    readingProgressSaveTimerRef.current = window.setTimeout(() => {
      saveReadingProgressNow()
      readingProgressSaveTimerRef.current = null
    }, 120)
  }, [saveReadingProgressNow])

  const restoreReadingProgress = useCallback(() => {
    const container = previewWrapRef.current
    if (!container) return
    const progress = loadReadingProgressFromStorage()
    if (progress) {
      container.scrollTop = getScrollTopFromProgress(container, progress)
    }
    readingProgressRestoredRef.current = true
  }, [])

  useEffect(() => {
    if (!ready || !html || readingProgressRestoredRef.current) return
    const frame = window.requestAnimationFrame(restoreReadingProgress)
    return () => window.cancelAnimationFrame(frame)
  }, [html, ready, restoreReadingProgress])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (readingProgressRestoredRef.current) saveReadingProgressNow()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveReadingProgressNow])

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
      saveReadingProgress()
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    // 初始化
    handleScroll()
    return () => container.removeEventListener('scroll', handleScroll)
  }, [saveReadingProgress, syncPreviewToEditor, tocItems])

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

  /* 分享：打开弹窗，逐步说明原理，由用户确认后再上传 */
  const openShareModal = useCallback(() => {
    const saved = loadGistToken()
    setGistToken(saved)
    setTokenInput(saved)
    setShareError('')
    setGeneratedShareUrl('')
    setGeneratedGistHtmlUrl('')
    setGeneratedGistId('')
    setShareLinkCopied(false)
    setGistPageUrlCopied(false)
    setShareModalOpen(true)
  }, [])

  const saveGistTokenToLocal = useCallback(() => {
    const token = tokenInput.trim()
    if (!token) {
      setShareError('请先填写 Token 再保存')
      return
    }
    try {
      localStorage.setItem(STORAGE_KEY_GIST_TOKEN, token)
      setGistToken(token)
      setShareError('')
    } catch {
      setShareError('无法写入本机存储，请检查浏览器设置')
    }
  }, [tokenInput])

  const clearGistTokenFromLocal = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_GIST_TOKEN)
    } catch { /* ignore */ }
    setGistToken('')
    setTokenInput('')
    setShareError('')
  }, [])

  const generateShareLink = useCallback(async () => {
    const token = tokenInput.trim() || gistToken
    if (!token) {
      setShareError('请先填写并保存 GitHub Token')
      return
    }
    setShareCreating(true)
    setShareError('')
    setGeneratedShareUrl('')
    setGeneratedGistHtmlUrl('')
    setGeneratedGistId('')
    setShareLinkCopied(false)
    setGistPageUrlCopied(false)
    try {
      const gist = await createSharedGist(md, token)
      setGeneratedShareUrl(buildGistShareUrl(gist.id, style))
      setGeneratedGistHtmlUrl(gist.htmlUrl)
      setGeneratedGistId(gist.id)
      // 若用户填了新 Token 但未点保存，生成成功后一并写入
      if (token !== gistToken) {
        try {
          localStorage.setItem(STORAGE_KEY_GIST_TOKEN, token)
          setGistToken(token)
        } catch { /* ignore */ }
      }
    } catch (error: unknown) {
      setShareError(error instanceof Error ? error.message : '分享失败')
    } finally {
      setShareCreating(false)
    }
  }, [gistToken, md, style, tokenInput])

  const copyGeneratedShareLink = useCallback(async () => {
    if (!generatedShareUrl) return
    try {
      await navigator.clipboard.writeText(generatedShareUrl)
      setShareLinkCopied(true)
      window.setTimeout(() => setShareLinkCopied(false), 1800)
    } catch {
      window.prompt('请手动复制以下分享链接：', generatedShareUrl)
    }
  }, [generatedShareUrl])

  const copyGistPageUrl = useCallback(async () => {
    if (!generatedGistHtmlUrl) return
    try {
      await navigator.clipboard.writeText(generatedGistHtmlUrl)
      setGistPageUrlCopied(true)
      window.setTimeout(() => setGistPageUrlCopied(false), 1800)
    } catch {
      window.prompt('请手动复制以下 GitHub Gist 页面地址（用于管理/删除）：', generatedGistHtmlUrl)
    }
  }, [generatedGistHtmlUrl])

  const copyTokenHelpUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(GIST_TOKEN_HELP_URL)
      setTokenUrlCopied(true)
      window.setTimeout(() => setTokenUrlCopied(false), 1500)
    } catch {
      window.prompt('请手动复制以下 GitHub 官方地址到浏览器地址栏打开：', GIST_TOKEN_HELP_URL)
    }
  }, [])

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
          onClick={openShareModal}
          className="px-3 py-1.5 text-sm font-medium rounded transition-colors bg-sky-500 text-white hover:bg-sky-600"
          title="打开分享说明窗口，上传至 GitHub Gist 并生成短链接"
        >
          🔗 分享链接
        </button>
        <button
          onClick={() => setReadMode((v) => !v)}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${readMode ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          title="阅读模式下隐藏编辑器，预览铺满整个页面"
        >
          {readMode ? '✏️ 编辑文档' : '👁️ 阅读模式'}
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
        {/* 编辑器（阅读模式下隐藏） */}
        {!readMode && (
          <div className="min-w-0 min-h-0" style={{ flex: `0 0 ${editorWidth}%` }}>
            <textarea
              ref={textareaRef}
              value={md}
              onChange={(e) => setMd(e.target.value)}
              onScroll={syncEditorToPreview}
              className="w-full h-full resize-none overscroll-contain p-4 text-sm leading-relaxed border-r border-gray-200 bg-white focus:outline-none font-mono"
              placeholder="在此输入 Markdown..."
            />
          </div>
        )}

        {!readMode && (
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
        )}

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
            ) : gistError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                <div className="text-rose-600 text-sm">{gistError}</div>
                <button
                  onClick={() => { setGistError(''); setReadMode(false) }}
                  className="px-3 py-1.5 text-sm font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                >
                  关闭，开始编辑新文档
                </button>
              </div>
            ) : gistLoading ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">正在加载分享的文档...</div>
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

      {/* 分享弹窗：原理说明 + Token 管理 + 显式生成 + 链接展示 */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShareModalOpen(false)}>
          <div className="w-full max-w-xl bg-white rounded-lg shadow-xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 mb-1">分享文档</h3>
            <p className="text-xs text-gray-500 mb-4">下面逐步说明会发生什么。确认理解后再操作，不会自动上传或复制。</p>

            {/* 原理科普 */}
            <section className="rounded-md border border-indigo-100 bg-indigo-50/50 p-3 mb-4">
              <h4 className="text-xs font-semibold text-indigo-800 mb-2">分享原理（发生了什么？）</h4>
              <ol className="space-y-2">
                {SHARE_PRINCIPLE_STEPS.map(({ step, title, detail }) => (
                  <li key={step} className="text-xs leading-relaxed">
                    <div className="font-medium text-gray-800">{step} {title}</div>
                    <div className="text-gray-600 mt-0.5">{detail}</div>
                  </li>
                ))}
              </ol>
            </section>

            {/* 限额与删除说明 */}
            <section className="rounded-md border border-amber-100 bg-amber-50/50 p-3 mb-4">
              <h4 className="text-xs font-semibold text-amber-900 mb-2">Gist 限额（GitHub 官方规则）</h4>
              <ul className="space-y-2 mb-3">
                {GIST_LIMIT_NOTES.map(({ title, detail }) => (
                  <li key={title} className="text-xs leading-relaxed">
                    <span className="font-medium text-gray-800">{title}：</span>
                    <span className="text-gray-600">{detail}</span>
                  </li>
                ))}
              </ul>
              <h4 className="text-xs font-semibold text-amber-900 mb-2">分享后能否删除？怎么删？</h4>
              <p className="text-xs text-gray-600 leading-relaxed mb-2">
                <strong>可以删除。</strong>文档存在你的 GitHub 账号下，删除权限在你手里，本站无法替你删除或撤回链接。删除源 Gist 后，之前发出去的本站分享链接会失效（加载时报错），但链接字符串本身不会自动消失。
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-600 leading-relaxed">
                {GIST_DELETE_STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>

            {/* Token 管理 */}
            <section className="rounded-md border border-gray-200 p-3 mb-4">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">第一步：填写 GitHub Token</h4>
              <p className="text-xs text-gray-600 leading-relaxed mb-2">
                Token 是 GitHub 官方 API 的授权凭证，只保存在<strong>本机浏览器</strong>，本站服务器不接触。权限只需 <code className="px-0.5 bg-gray-100 rounded">gist</code>，不要勾选 repo 等其它权限。
              </p>
              {gistToken && (
                <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-1.5 mb-2">
                  本机已保存 Token（末尾 {maskGistToken(gistToken)}）。可在下方修改后重新保存，或清除。
                </div>
              )}

              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 mb-3">
                <div className="text-xs font-medium text-gray-500 mb-1">GitHub 官方 Token 创建页地址（请自行复制到浏览器地址栏打开）</div>
                <div className="text-xs text-gray-800 font-mono break-all leading-relaxed select-all">{GIST_TOKEN_HELP_URL}</div>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  也可手动进入：{GIST_TOKEN_HELP_PATH}，勾选 gist 后生成。
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs font-medium text-gray-600 mb-2">上述地址各参数含义</div>
                  <ul className="space-y-2">
                    {GIST_TOKEN_URL_PARTS.map(({ part, meaning }) => (
                      <li key={part} className="text-xs leading-relaxed">
                        <code className="block px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-gray-800 break-all mb-0.5">{part}</code>
                        <span className="text-gray-600">{meaning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => void copyTokenHelpUrl()}
                  className="mt-3 px-2.5 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors"
                >
                  {tokenUrlCopied ? '✅ 已复制地址' : '复制上述地址'}
                </button>
              </div>

              <label className="block text-xs font-medium text-gray-600 mb-1">粘贴 Token</label>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_... 或 github_pat_..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded font-mono focus:border-sky-400 focus:outline-none mb-2"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveGistTokenToLocal}
                  disabled={!tokenInput.trim()}
                  className="px-2.5 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  保存到本机
                </button>
                {gistToken && (
                  <button
                    type="button"
                    onClick={clearGistTokenFromLocal}
                    className="px-2.5 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition-colors"
                  >
                    清除已保存的 Token
                  </button>
                )}
              </div>
            </section>

            {/* 生成 */}
            <section className="rounded-md border border-gray-200 p-3 mb-4">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">第二步：上传至 GitHub 并生成链接</h4>
              <p className="text-xs text-gray-600 leading-relaxed mb-3">
                点击后，浏览器会把<strong>当前编辑器里的 Markdown 正文</strong>上传到你 GitHub 账号下的一个新 Secret Gist。每次分享都会新建一个 Gist，不会覆盖之前的。
              </p>
              <button
                type="button"
                onClick={() => void generateShareLink()}
                disabled={shareCreating || (!tokenInput.trim() && !gistToken)}
                className="w-full px-3 py-2 text-sm font-medium bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors disabled:opacity-50"
              >
                {shareCreating ? '正在请求 GitHub API…' : '上传至 GitHub 并生成分享链接'}
              </button>
            </section>

            {/* 生成结果 */}
            {generatedShareUrl && (
              <section className="rounded-md border border-green-200 bg-green-50/50 p-3 mb-4">
                <h4 className="text-xs font-semibold text-green-800 mb-2">第三步：复制分享链接发给他人</h4>
                <p className="text-xs text-gray-600 leading-relaxed mb-2">
                  链接已生成。请核对下方地址，确认域名是 <code className="px-0.5 bg-white rounded">tools.tobenot.top</code>（或你当前访问的本站域名），再复制发给访客。
                </p>
                <div className="text-xs text-gray-800 font-mono break-all leading-relaxed select-all bg-white border border-green-200 rounded px-2 py-2 mb-3">
                  {generatedShareUrl}
                </div>
                <button
                  type="button"
                  onClick={() => void copyGeneratedShareLink()}
                  className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors mb-4"
                >
                  {shareLinkCopied ? '✅ 已复制分享链接' : '复制分享链接'}
                </button>

                <div className="pt-3 border-t border-green-200">
                  <h5 className="text-xs font-semibold text-gray-800 mb-2">GitHub 上的 Gist 管理地址（用于查看 / 删除）</h5>
                  <p className="text-xs text-gray-600 leading-relaxed mb-2">
                    Gist 编号：<code className="px-0.5 bg-white rounded font-mono">{generatedGistId}</code>。若要删除这篇分享，请复制下方 GitHub 地址到浏览器打开（需登录创建者账号），在页面右上角 Delete。
                  </p>
                  <div className="text-xs text-gray-800 font-mono break-all leading-relaxed select-all bg-white border border-gray-200 rounded px-2 py-2 mb-2">
                    {generatedGistHtmlUrl}
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyGistPageUrl()}
                    className="px-2.5 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors"
                  >
                    {gistPageUrlCopied ? '✅ 已复制 Gist 地址' : '复制 Gist 管理页地址'}
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-green-200">
                  <div className="text-xs font-medium text-gray-600 mb-2">分享链接各参数含义</div>
                  <ul className="space-y-2">
                    {SHARE_LINK_URL_PARTS.map(({ part, meaning }) => (
                      <li key={part} className="text-xs leading-relaxed">
                        <code className="block px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-gray-800 break-all mb-0.5">{part}</code>
                        <span className="text-gray-600">{meaning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {shareError && <div className="text-rose-600 text-xs mb-3">{shareError}</div>}

            <div className="flex justify-end">
              <button
                onClick={() => setShareModalOpen(false)}
                className="px-3 py-1.5 text-sm font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
