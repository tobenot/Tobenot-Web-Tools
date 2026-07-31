# Mecha Tools

基于 React + Vite + Tailwind 的 Web 工具集，采用「白净机械风」主题。

**核心特点：无后端。** 所有处理都在浏览器内完成，状态通过 URL 分享（详见 [架构说明](docs/architecture.md)）。

线上地址：<https://tools.tobenot.top>

---

## 快速开始

```bash
npm install
npm run dev
```

## 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览构建产物 |
| `npm run lint` | ESLint 检查 |
| `npm test` | 运行单元测试（Vitest） |
| `npm run check` | 安全与契约自检（CSP 哈希 + 即时链接编码往返） |
| `npm run new:app <slug>` | 生成一个独立 HTML 应用脚手架 |

CI 会依次执行 `tsc` → `lint` → `test` → `check` → `build`，任一失败即阻止部署。

---

## 内容清单

### React 工具（`src/tools/`，hash 路由）

| 工具 | 路由 | 说明 |
|------|------|------|
| Markdown 阅读器 | `#markdown-reader` | 实时预览、多风格切换、图片导出、`?c=` 即时链接与 Gist 分享 |
| 日历工具 | `#calendar` | 查看与分享指定日期（`?d=`），含农历与节假日 |
| 提示词展柜 | `#prompt-gallery` | 浏览、预览并复制常用提示词预设 |
| 图片去底 | `#bg-remover` | 批量去除背景底色，支持取色、容差与边缘羽化 |
| 图片转 WebP | `#image-to-webp` | 批量转换，质量调节与 ZIP 打包 |
| 图片描边 | `#image-outline` | 沿轮廓添加平滑描边，支持双层描边与投影 |
| JSON 表格查看器 | `#json-viewer` | 嵌套表格化视图，支持文件导入 |
| 正则测试器 | `#regex-tester` | 实时匹配高亮与捕获分组，含 ReDoS 熔断 |
| 文本 Diff | `#text-diff` | 逐行对比并高亮差异 |
| Base64 编解码 | `#base64` | 文本与文件互转，支持 UTF-8 |
| URL 编解码 | `#url-codec` | encodeURI / encodeURIComponent 实时转换 |
| 空格/Tab 转换 | `#space-tab-converter` | 代码缩进互转 |
| 二维码生成 | `#qrcode` | 自定义颜色与尺寸，支持下载 |
| 大字展示板 | `#big-text` | 大字展示，适合辅助沟通场景 |

### 独立 HTML 应用（`apps/`）

不依赖 React，单文件内联样式与脚本，加载更快、维护更简单。

| 应用 | 路径 | 说明 |
|------|------|------|
| 调色板生成器 | `apps/color-palette/` | 生成与调整配色方案 |
| 文件名与内容拼接 | `apps/file-concat/` | 批量拼接多个文件的名称与内容 |
| LLM Prompt 清洗 | `apps/llm-prompt-cleaner/` | 清理提示词中的冗余格式 |
| Markdown 格式移除器 | `apps/markdown-stripper/` | 剥离 Markdown 标记，得到纯文本 |
| 大纲排序器 | `apps/outline-reorder/` | 拖拽调整 Markdown 章节顺序 |
| 无缝贴图预览 | `apps/seamless-texture/` | 平铺预览贴图接缝效果 |

> 新增应用需同时创建 `meta.json`，否则不会出现在首页与 Ctrl+K 搜索中（构建时会告警）。
> 若为有意隐藏，请在 `meta.json` 中设置 `"hidden": true`。

---

## 运行时 CDN 依赖

**注意：以下库不在 `package.json` 中，而是运行时按需从 CDN 加载**（见 `src/utils/loadScript.ts`）。
这是为了保持主 bundle 精简——只有真正打开相关工具时才会下载。

| 库 | 版本 | 用途 |
|----|------|------|
| `marked` | 15.0.7 | Markdown 解析 |
| `mermaid` | 10.9.1 | 图表渲染 |
| `html2canvas` | 1.4.1 | 导出图片 |
| `lz-string` | 1.5.0 | 即时链接压缩 |

两条硬性约定：

1. **必须钉死版本号。** 分享链接是长期契约，上游 latest 的破坏性变更会静默破坏历史链接。
2. **必须附 SRI（`integrity`）。** 升级时需同步重算摘要，否则浏览器会拒绝执行。

`marked` v5+ 已移除内建 `sanitize`，因此所有渲染结果**必须**经 `src/utils/sanitize.ts` 过滤后再注入 DOM。
详见 [架构说明 §7 安全模型](docs/architecture.md)。

---

## 目录结构

```
src/
  data/routes.ts      工具注册表（单一真相：标题/路由/懒加载/全屏标记）
  utils/
    hash.ts           hash 路径与参数解析
    sanitize.ts       HTML 净化，不可信正文的第一道防线
    loadScript.ts     CDN 加载 + 钉死版本与 SRI 清单
  tools/<id>/         各 React 工具
  components/         共享组件
apps/<slug>/          独立 HTML 应用（index.html + meta.json）
scripts/
  check-csp.mjs       CSP 内联脚本哈希与策略强度自检
  check-lz-url.mjs    即时链接编码往返自检
  new-app.mjs         应用脚手架
```

### 新增一个 React 工具

只需改一处：在 `src/data/routes.ts` 的 `tools` 数组里追加条目并挂上 `component`。
页面标题、404 判定、Ctrl+K 搜索、favicon 均由此派生。

### 新增一个独立 HTML 应用

```bash
npm run new:app my-tool -- --title "我的工具"
```

生成 `apps/my-tool/index.html` 与 `meta.json`，构建时自动发现为多页入口。

---

## 主题与样式

- 全部使用 Tailwind 工具类，不写自定义 CSS 文件。
- 主题色在 `tailwind.config.js` 的 `theme.extend.colors.mech`。
- 机械风直角圆角统一用 `rounded-mech`（2px），**不要内联 `style={{ borderRadius }}`**。
- 动画统一在 config 的 `keyframes` / `animation` 中定义，**不要在组件里内联 `<style>` 块**。
- 已启用 `@tailwindcss/forms` 与 `@tailwindcss/typography`。
- 暗色模式为 class 策略，新增 UI 时请同步补 `dark:` 变体。

---

## 相关文档

- [架构说明](docs/architecture.md)：hash 分享模型、即时链接与 Gist 通道、安全模型
- [演进规划](docs/roadmap.md)
- [代码评审记录](docs/project-review.md)
