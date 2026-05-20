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
}

export const tools: ToolDef[] = [
  {
    id: 'calendar',
    title: '日历工具',
    description: '快速查看与分享指定日期',
    emoji: '🗓️',
    version: 'v0.1',
    category: 'utility',
    href: '#calendar'
  },
  {
    id: 'markdown-reader',
    title: 'Markdown 阅读器',
    description: '精美 Markdown 实时预览，多种风格切换与图片导出',
    emoji: '📖',
    version: 'v0.1',
    category: 'utility',
    href: '#markdown-reader'
  },
  {
    id: 'prompt-gallery',
    title: '提示词展柜',
    description: '浏览、预览并复制常用提示词预设',
    emoji: 'Pr',
    version: 'v0.1',
    category: 'utility',
    href: '#prompt-gallery'
  },
  {
    id: 'bg-remover',
    title: '图片去底工具',
    description: '批量去除图片背景底色，支持取色、容差调节与边缘羽化',
    emoji: '🖼️',
    version: 'v0.1',
    category: 'utility',
    href: '#bg-remover'
  },
  {
    id: 'space-tab-converter',
    title: '空格/Tab 转换器',
    description: '代码缩进空格与 Tab 相互转换工具',
    emoji: '↔️',
    version: 'v0.1',
    category: 'utility',
    href: '#space-tab-converter'
  },
  {
    id: 'json-viewer',
    title: 'JSON 表格查看器',
    description: '易读的 JSON 表格化视图，支持嵌套表格和文件导入',
    emoji: '📊',
    version: 'v0.1',
    category: 'utility',
    href: '#json-viewer'
  },
  {
    id: 'base64',
    title: 'Base64 编解码',
    description: '文本与文件的 Base64 编码/解码，支持 UTF-8',
    emoji: '🔐',
    version: 'v1.0',
    category: 'utility',
    href: '#base64'
  },
  {
    id: 'url-codec',
    title: 'URL 编解码',
    description: 'encodeURI / decodeURI / encodeURIComponent 实时转换',
    emoji: '🔗',
    version: 'v1.0',
    category: 'utility',
    href: '#url-codec'
  },
  {
    id: 'regex-tester',
    title: '正则测试器',
    description: '实时正则表达式测试，高亮匹配，显示捕获分组',
    emoji: '🎯',
    version: 'v1.0',
    category: 'utility',
    href: '#regex-tester'
  },
  {
    id: 'changelog',
    title: '更新日志',
    description: '查看项目更新记录',
    emoji: '📝',
    version: '站点',
    category: 'info',
    href: '#changelog'
  }
]

export const pageTitleMap: Record<string, string> = {
  '': 'Mecha Tools | 现代机械风 Web 工具站',
  calendar: '日历工具 | Mecha Tools',
  'markdown-reader': 'Markdown 阅读器 | Mecha Tools',
  'prompt-gallery': '提示词展柜 | Mecha Tools',
  'json-viewer': 'JSON 表格查看器 | Mecha Tools',
  'bg-remover': '图片去底工具 | Mecha Tools',
  'space-tab-converter': '空格/Tab 转换器 | Mecha Tools',
  'base64': 'Base64 编解码 | Mecha Tools',
  'url-codec': 'URL 编解码 | Mecha Tools',
  'regex-tester': '正则测试器 | Mecha Tools',
  changelog: '更新日志 | Mecha Tools',
  about: '关于与设计 | Mecha Tools'
}

export const globalChangelog: ChangelogEntry[] = [
  { date: '2025-08-08', title: '项目初始化', notes: ['添加首页导航与机械风主题', '实现日历工具 v0.1（支持哈希分享 `?d=YYYY-MM-DD`）', '加入通用工具模板（分享、设计、更新日志）', '配置 GitHub Pages 自动部署'] },
]
