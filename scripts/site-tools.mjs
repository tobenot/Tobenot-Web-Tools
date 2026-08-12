// 构建期工具清单：预渲染（vite.config）与 OG 图生成（gen-og）共用。
// 单一事实源是 src/data/routes.ts —— 新增工具时同步这里的一行，再 `node scripts/gen-og.mjs` 补图。
// 漏同步不会静默：`npm run check`（check:tools）会比对 routes.ts 与本文件并在 CI 卡红。
export const siteTools = [
  { id: 'calendar', title: '日历工具', description: '快速查看与分享指定日期' },
  { id: 'markdown-reader', title: 'Markdown 阅读器', description: '精美 Markdown 实时预览，多种风格切换、图片导出与 Gist 链接分享' },
  { id: 'prompt-gallery', title: '提示词展柜', description: '浏览、预览并复制常用提示词预设' },
  { id: 'bg-remover', title: '图片去底工具', description: '批量去除图片背景底色，支持取色、容差调节与边缘羽化' },
  { id: 'image-to-webp', title: '图片转 WebP', description: '批量将 PNG / JPG 等图片转换为 WebP，支持质量调节与 ZIP 打包下载' },
  { id: 'image-outline', title: '图片描边工具', description: '为透明底图片沿轮廓添加平滑描边，支持双层描边、投影与批量处理' },
  { id: 'space-tab-converter', title: '空格 / Tab 转换器', description: '代码缩进空格与 Tab 相互转换工具' },
  { id: 'json-viewer', title: 'JSON 表格查看器', description: '易读的 JSON 表格化视图，支持嵌套表格和文件导入' },
  { id: 'base64', title: 'Base64 编解码', description: '文本与文件的 Base64 编码/解码，支持 UTF-8' },
  { id: 'url-codec', title: 'URL 编解码', description: 'encodeURI / decodeURI / encodeURIComponent 实时转换' },
  { id: 'regex-tester', title: '正则测试器', description: '实时正则表达式测试，高亮匹配，显示捕获分组' },
  { id: 'text-diff', title: '文本 Diff 对比', description: '逐行对比两段文本，高亮新增和删除的差异' },
  { id: 'qrcode', title: '二维码生成', description: '输入文本或 URL 即时生成二维码，支持自定义颜色和下载' },
  { id: 'big-text', title: '大字展示板', description: '输入文字即时大字展示，适合需要辅助沟通的场景' },
  { id: 'secure-archive', title: '安全压缩脚本', description: '为 Windows + 7-Zip 生成加密压缩脚本（.bat），AES-256 加密文件与文件名，密码交互式输入' },
  { id: 'archive-reader', title: '文档集阅读器', description: '上传 .zip 压缩包，浏览器内解压并浏览其中全部 Markdown 文档（含子目录）' },
]
