# Mecha Tools

浏览器内 Web 工具集（React + Vite + Tailwind），无后端。站点：<https://tools.tobenot.top>

状态走 URL 分享。详见 [架构说明](docs/architecture.md)。

## 快速开始

```bash
npm install
npm run dev
```

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览构建 |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run check` | CSP 哈希 + 即时链接往返 |
| `npm run new:app <slug>` | 生成独立 HTML 应用 |

CI：`tsc` → `lint` → `test` → `check` → `build`。

## 工具

首页按用途分组。React 工具是 hash 路由；`apps/` 是独立 HTML（需 `meta.json`，`"hidden": true` 则不出现在首页）。

### 图片

| 工具 | 入口 |
|------|------|
| 图片去底 | `#bg-remover` |
| 图片转 WebP | `#image-to-webp` |
| 图片描边 | `#image-outline` |
| 无缝贴图预览 | `apps/seamless-texture/` |
| 调色板生成器 | `apps/color-palette/` |
| AI 图片生成 | `apps/image-generator/` |
| 批量区域裁剪 | `apps/batch-cropper/` |

### 文档

| 工具 | 入口 |
|------|------|
| Markdown 阅读器 | `#markdown-reader` |
| 文档集阅读器 | `#archive-reader` |
| 大纲排序器 | `apps/outline-reorder/` |
| Markdown 格式移除器 | `apps/markdown-stripper/` |

### 文本

| 工具 | 入口 |
|------|------|
| 提示词展柜 | `#prompt-gallery` |
| 空格/Tab 转换 | `#space-tab-converter` |
| 正则测试器 | `#regex-tester` |
| 文本 Diff | `#text-diff` |
| 大字展示板 | `#big-text` |
| 字数统计 | `apps/word-count/` |
| LLM Prompt 清洗 | `apps/llm-prompt-cleaner/` |

### 编码

| 工具 | 入口 |
|------|------|
| JSON 表格查看器 | `#json-viewer` |
| Base64 编解码 | `#base64` |
| URL 编解码 | `#url-codec` |

### 文件

| 工具 | 入口 |
|------|------|
| 安全压缩脚本 | `#secure-archive` |
| 文件名与内容拼接 | `apps/file-concat/` |
| Wormhole 文件分享 | 外链 [wormhole.app](https://wormhole.app/) |

### 其他

| 工具 | 入口 |
|------|------|
| 日历 | `#calendar` |
| 二维码生成 | `#qrcode` |

新增 React 工具：在 `src/data/routes.ts` 追加一条。新增独立页：`npm run new:app <slug>`。

## 相关文档

- [架构说明](docs/architecture.md)
- [演进规划](docs/roadmap.md)
- [代码评审记录](docs/project-review.md)
