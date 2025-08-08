# Mecha Tools

基于 React + Vite + Tailwind 的 Web 工具集。已采用“白净机械风”主题与 Tailwind 最佳实践（不写自定义 CSS 文件，完全使用类名）。

## 开发

- 启动开发：

```bash
npm run dev
```

- 构建：

```bash
npm run build
```

## 主题与样式

- 所有样式通过 Tailwind 工具类完成，主题色定义在 `tailwind.config.js` 的 `theme.extend.colors.mech`。
- 已启用插件：`@tailwindcss/forms`、`@tailwindcss/typography`。
- 在页面上直接使用工具类组合，例如：

```html
<div class="bg-mech-panel border border-mech-edge rounded-xl shadow-subtle p-6">...</div>
```

## 多个单页 HTML 应用（Multi-Page Build）

- 目录：`apps/<app-name>/index.html`
- 构建时会自动发现 `apps/*/index.html` 并输出到 `dist/apps/<app-name>/index.html`。
- HTML 中直接引入共享样式：

```html
<link rel="stylesheet" href="/src/index.css" />
```

- 示例：`apps/hello/index.html`

## 快速创建一个新页面

```bash
npm run new:app my-tool -- --title "我的工具"
```

它会生成：`apps/my-tool/index.html`，你可以直接在该文件继续开发，无需单独的 CSS 文件。

## 路由

- 站点根为 React 单页，使用 `#hash` 路由（见 `src/utils/hash.ts`）。
- 纯 HTML 页面则存放于 `apps/`，不使用 React 路由，便于批量添加与部署。
