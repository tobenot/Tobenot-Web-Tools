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
    description: '精美 Markdown 实时预览，多种风格切换、图片导出与 Gist 链接分享',
    emoji: '📖',
    version: 'v0.2',
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
    id: 'image-outline',
    title: '图片描边工具',
    description: '为透明底图片沿轮廓添加平滑描边，支持双层描边、投影与批量处理',
    emoji: '🖊️',
    version: 'v1.0',
    category: 'utility',
    href: '#image-outline',
    tags: ['图片', '描边', '贴纸', '透明底']
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
    id: 'text-diff',
    title: '文本 Diff 对比',
    description: '逐行对比两段文本，高亮新增和删除的差异',
    emoji: '📝',
    version: 'v1.0',
    category: 'utility',
    href: '#text-diff'
  },
  {
    id: 'qrcode',
    title: '二维码生成',
    description: '输入文本或 URL 即时生成二维码，支持自定义颜色和下载',
    emoji: '📱',
    version: 'v1.0',
    category: 'utility',
    href: '#qrcode'
  },
  {
    id: 'big-text',
    title: '大字展示板',
    description: '输入文字即时大字展示，适合需要辅助沟通的场景',
    emoji: '🔤',
    version: 'v1.0',
    category: 'app',
    href: '#big-text',
    tags: ['沟通', '无障碍', '展示']
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
  'image-outline': '图片描边工具 | Mecha Tools',
  'space-tab-converter': '空格/Tab 转换器 | Mecha Tools',
  'base64': 'Base64 编解码 | Mecha Tools',
  'url-codec': 'URL 编解码 | Mecha Tools',
  'regex-tester': '正则测试器 | Mecha Tools',
  'text-diff': '文本 Diff 对比 | Mecha Tools',
  'qrcode': '二维码生成 | Mecha Tools',
  'big-text': '大字展示板 | Mecha Tools',
  changelog: '更新日志 | Mecha Tools',
  about: '关于与设计 | Mecha Tools'
}

export const globalChangelog: ChangelogEntry[] = [
  {
    date: '2026-06-29',
    title: 'Markdown 阅读器支持 Gist 链接分享',
    notes: [
      '新增「分享链接」：将文档上传为私密 Gist，生成带 gist id 的短链接，大文档也不怕 URL 过长',
      '分享者需填一次带 gist 权限的 GitHub Token（仅存本机浏览器）；访客查看无需 Token 或账号',
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
