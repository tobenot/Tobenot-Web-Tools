import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { ChangelogEntry } from '../components/Changelog'

export interface ToolDef {
  id: string
  title: string
  description: string
  emoji: string
  version: string
  category: 'utility' | 'app' | 'info'
  href: string
  tags?: string[]
  /** 外链工具：仅出现在首页与 Ctrl+K，不参与站内路由 */
  external?: boolean
  /** 是否占满视口（自带滚动容器、隐藏页脚），如阅读器、大字板 */
  fullPage?: boolean
  /**
   * 工具组件。懒加载以避免把全部工具塞进首屏 bundle。
   * 缺省表示该条目只是导航入口（如 changelog），由 App 单独处理。
   */
  component?: LazyExoticComponent<ComponentType>
}

/* 懒加载：命名导出需要映射成 default */
const lazyTool = (loader: () => Promise<Record<string, ComponentType<any>>>, exportName: string) =>
  lazy(() => loader().then((m) => ({ default: m[exportName] })))

export const tools: ToolDef[] = [
  {
    id: 'calendar',
    title: '日历工具',
    description: '快速查看与分享指定日期',
    emoji: '🗓️',
    version: 'v0.1',
    category: 'utility',
    href: '/calendar',
    component: lazyTool(() => import('../tools/calendar/CalendarTool'), 'CalendarTool')
  },
  {
    id: 'markdown-reader',
    title: 'Markdown 阅读器',
    description: '精美 Markdown 实时预览，多种风格切换、图片导出与 Gist 链接分享',
    emoji: '📖',
    version: 'v0.2',
    category: 'utility',
    href: '/markdown-reader',
    fullPage: true,
    component: lazyTool(() => import('../tools/markdown-reader/MarkdownReaderTool'), 'MarkdownReaderTool')
  },
  {
    id: 'prompt-gallery',
    title: '提示词展柜',
    description: '浏览、预览并复制常用提示词预设',
    emoji: 'Pr',
    version: 'v0.1',
    category: 'utility',
    href: '/prompt-gallery',
    component: lazyTool(() => import('../tools/prompt-gallery/PromptGalleryTool'), 'PromptGalleryTool')
  },
  {
    id: 'bg-remover',
    title: '图片去底工具',
    description: '批量去除图片背景底色，支持取色、容差调节与边缘羽化',
    emoji: '🖼️',
    version: 'v0.1',
    category: 'utility',
    href: '/bg-remover',
    component: lazyTool(() => import('../tools/bg-remover/BgRemoverTool'), 'BgRemoverTool')
  },
  {
    id: 'image-to-webp',
    title: '图片转 WebP',
    description: '批量将 PNG / JPG 等图片转换为 WebP，支持质量调节与 ZIP 打包下载',
    emoji: '🗜️',
    version: 'v1.0',
    category: 'utility',
    href: '/image-to-webp',
    tags: ['图片', 'WebP', '压缩', '批量'],
    component: lazyTool(() => import('../tools/image-to-webp/ImageToWebpTool'), 'ImageToWebpTool')
  },
  {
    id: 'image-outline',
    title: '图片描边工具',
    description: '为透明底图片沿轮廓添加平滑描边，支持双层描边、投影与批量处理',
    emoji: '🖊️',
    version: 'v1.0',
    category: 'utility',
    href: '/image-outline',
    tags: ['图片', '描边', '贴纸', '透明底'],
    component: lazyTool(() => import('../tools/image-outline/ImageOutlineTool'), 'ImageOutlineTool')
  },
  {
    id: 'space-tab-converter',
    title: '空格/Tab 转换器',
    description: '代码缩进空格与 Tab 相互转换工具',
    emoji: '↔️',
    version: 'v0.1',
    category: 'utility',
    href: '/space-tab-converter',
    component: lazyTool(() => import('../tools/space-tab-converter/SpaceTabConverterTool'), 'SpaceTabConverterTool')
  },
  {
    id: 'json-viewer',
    title: 'JSON 表格查看器',
    description: '易读的 JSON 表格化视图，支持嵌套表格和文件导入',
    emoji: '📊',
    version: 'v0.1',
    category: 'utility',
    href: '/json-viewer',
    component: lazyTool(() => import('../tools/json-viewer/JsonViewerTool'), 'JsonViewerTool')
  },
  {
    id: 'base64',
    title: 'Base64 编解码',
    description: '文本与文件的 Base64 编码/解码，支持 UTF-8',
    emoji: '🔐',
    version: 'v1.0',
    category: 'utility',
    href: '/base64',
    component: lazyTool(() => import('../tools/base64/Base64Tool'), 'Base64Tool')
  },
  {
    id: 'url-codec',
    title: 'URL 编解码',
    description: 'encodeURI / decodeURI / encodeURIComponent 实时转换',
    emoji: '🔗',
    version: 'v1.0',
    category: 'utility',
    href: '/url-codec',
    component: lazyTool(() => import('../tools/url-codec/UrlCodecTool'), 'UrlCodecTool')
  },
  {
    id: 'regex-tester',
    title: '正则测试器',
    description: '实时正则表达式测试，高亮匹配，显示捕获分组',
    emoji: '🎯',
    version: 'v1.0',
    category: 'utility',
    href: '/regex-tester',
    component: lazyTool(() => import('../tools/regex-tester/RegexTesterTool'), 'RegexTesterTool')
  },
  {
    id: 'text-diff',
    title: '文本 Diff 对比',
    description: '逐行对比两段文本，高亮新增和删除的差异',
    emoji: '📝',
    version: 'v1.0',
    category: 'utility',
    href: '/text-diff',
    component: lazyTool(() => import('../tools/text-diff/TextDiffTool'), 'TextDiffTool')
  },
  {
    id: 'qrcode',
    title: '二维码生成',
    description: '输入文本或 URL 即时生成二维码，支持自定义颜色和下载',
    emoji: '📱',
    version: 'v1.0',
    category: 'utility',
    href: '/qrcode',
    component: lazyTool(() => import('../tools/qrcode/QrCodeTool'), 'QrCodeTool')
  },
  {
    id: 'big-text',
    title: '大字展示板',
    description: '输入文字即时大字展示，适合需要辅助沟通的场景',
    emoji: '🔤',
    version: 'v1.0',
    category: 'app',
    href: '/big-text',
    tags: ['沟通', '无障碍', '展示'],
    fullPage: true,
    component: lazyTool(() => import('../tools/big-text/BigTextTool'), 'BigTextTool')
  },
  {
    id: 'wormhole',
    title: 'Wormhole 文件分享',
    description: '端到端加密的临时文件传输，链接自动过期，最高支持 10 GB',
    emoji: '🕳️',
    version: '外链',
    category: 'utility',
    href: 'https://wormhole.app/',
    tags: ['文件', '分享', '加密', '传输'],
    external: true
  },
  {
    id: 'changelog',
    title: '更新日志',
    description: '查看项目更新记录',
    emoji: '📝',
    version: '站点',
    category: 'info',
    href: '/changelog'
  }
]

/* ─── 由注册表派生的查询结构 ─── */

const SITE_TITLE = 'Mecha Tools | 现代机械风 Web 工具站'

export const toolsById: Record<string, ToolDef> = Object.fromEntries(
  tools.map((t) => [t.id, t])
)

/**
 * 页面标题表。从 tools 派生，避免新增工具时漏改而静默 fallback。
 * 仅非工具页（首页、关于）需要手写。
 */
export const pageTitleMap: Record<string, string> = {
  '': SITE_TITLE,
  about: '关于与设计 | Mecha Tools',
  ...Object.fromEntries(tools.map((t) => [t.id, `${t.title} | Mecha Tools`]))
}

export function getPageTitle(path: string): string {
  return pageTitleMap[path] ?? SITE_TITLE
}

/** 已注册的路由集合（含非工具页），用于 404 判定与「最近使用」过滤 */
export const knownRoutes = new Set<string>(['', 'about', ...tools.filter((t) => !t.external).map((t) => t.id)])

export function isKnownRoute(path: string): boolean {
  return knownRoutes.has(path)
}

export const globalChangelog: ChangelogEntry[] = [
  {
    date: '2026-07-30',
    title: '工程与体验改进：代码分割、404 页与工程护栏',
    notes: [
      '路由改为注册表驱动：新增 404 页，访问失效链接不再是空白页',
      '工具改为按需加载（React.lazy），首屏体积显著下降',
      '修复正则测试器在渲染期更新状态的问题，并加入匹配数与耗时熔断，避免病态正则卡死页面',
      '补齐更新日志、分享按钮等组件的暗色模式样式',
      '接入 ESLint 与 Vitest 单元测试，并将全部自检纳入 CI'
    ]
  },
  {
    date: '2026-07-30',
    title: '安全加固：Markdown 渲染净化与凭证隔离',
    notes: [
      '修复高危 XSS：通过 `?c=` / `?gist=` 打开的正文此前未经净化直接渲染，现统一走 DOMPurify 过滤',
      'GitHub Token 由 localStorage 改为 sessionStorage（关闭标签页即清除），并清理旧版本残留',
      '阅读他人分享链接时不再读取本机 Token —— 看别人的文档不需要凭证',
      '所有 CDN 依赖钉死版本并附 SRI 校验；新增 CSP 白名单阻断脚本执行与数据外发',
      '新增 `npm run check:csp` 自检并接入 CI，防止策略被无声放宽'
    ]
  },
  {
    date: '2026-07-28',
    title: 'Markdown 阅读器支持即时链接分享',
    notes: [
      '新增 `?c=` 参数：用 lz-string 把正文压缩进 URL 片段，无需上传、无需 Token，点开即渲染',
      '分享面板新增「即时链接 / 嵌入」页：可一键生成链接，并提供任意 HTML 可复制的嵌入示例',
      '大文档仍走 Gist；打开时若同时带 c 与 gist，优先使用 c'
    ]
  },
  {
    date: '2026-07-03',
    title: '新增图片转 WebP 工具',
    notes: [
      '批量将 PNG / JPG 等图片转换为 WebP',
      '支持质量滑块调节、单张下载与 ZIP 打包下载'
    ]
  },
  {
    date: '2026-06-29',
    title: 'Markdown 阅读器支持 Gist 链接分享',
    notes: [
      '新增「分享链接」：将文档上传为私密 Gist，生成带 gist id 的短链接，大文档也不怕 URL 过长',
      '分享者需填一次带 gist 权限的 GitHub Token（仅存本机浏览器会话，关闭标签页即清除）；访客查看无需 Token 或账号',
      '通过分享链接打开时自动进入阅读模式（隐藏编辑器、预览铺满），并还原所选风格，不覆盖本机草稿'
    ]
  },
  {
    date: '2026-06-07',
    title: '域名迁移',
    notes: [
      '由 tobenot.top/Tobenot-Web-Tools/ 迁至 tools.tobenot.top',
      '路由方式不变，仍为 # 哈希直达',
      '请更新书签与外链域名'
    ]
  },
  { date: '2025-08-08', title: '项目初始化', notes: ['添加首页导航与机械风主题', '实现日历工具 v0.1（支持哈希分享 `?d=YYYY-MM-DD`）', '加入通用工具模板（分享、设计、更新日志）', '配置 GitHub Pages 自动部署'] },
]
