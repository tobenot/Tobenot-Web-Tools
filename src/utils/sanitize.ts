import DOMPurify from 'dompurify'

/*
 * 统一的 HTML 净化入口。
 *
 * 为什么必须有这一层：
 * Markdown 阅读器的正文可以来自 `?c=`（任意人构造的链接）或 `?gist=`（任意 Gist ID），
 * 属于完全不可信的外部输入；而 marked v5+ 已移除内建 sanitize 选项，裸 HTML 会原样穿透。
 * 若直接 dangerouslySetInnerHTML，等于把 XSS 入口暴露给任何分享链接。
 *
 * 同源 localStorage 里可能存着带 gist 权限的 GitHub Token，一次 XSS 即可导致凭证外泄，
 * 因此这里不接受任何“黑名单式”自研过滤，统一走 DOMPurify。
 */

/*
 * 统一给净化后的外链补 target/rel，避免 reverse tabnabbing。
 *
 * 在模块加载时立即注册，而非导出一个需要调用方记得调用的 install 函数：
 * 后者一旦有人漏调，防护会静默失效，而净化函数本身看起来仍"正常工作"。
 * 安全相关的默认值不应依赖调用方的自觉。
 */
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.nodeName === 'A' && node instanceof Element && node.hasAttribute('href')) {
    // 同页片段锚点（#frag）由预览区 click 委托做同页滚动；加 target=_blank 会让中键/直接点击开新窗，语义错误
    if ((node.getAttribute('href') || '').startsWith('#')) return
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer nofollow')
  }
})

/** mermaid 渲染产物是内联 SVG，需要放行这些标签/属性，否则图表会被清空 */
const SVG_TAGS = [
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'defs', 'marker', 'use', 'symbol', 'clippath', 'lineargradient',
  'radialgradient', 'stop', 'pattern', 'mask', 'foreignobject', 'title', 'desc',
]

const SVG_ATTRS = [
  'viewbox', 'preserveaspectratio', 'transform', 'fill', 'stroke', 'stroke-width',
  'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'd', 'cx', 'cy', 'r',
  'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'width', 'height',
  'text-anchor', 'dominant-baseline', 'font-size', 'font-family', 'font-weight',
  'marker-end', 'marker-start', 'offset', 'stop-color', 'stop-opacity',
  'gradientunits', 'patternunits', 'opacity', 'fill-opacity',
]

/** 图表容器需要保留 class 与 data-diagram-type，供后续 mermaid / kroki 渲染定位 */
const DIAGRAM_ATTRS = ['data-diagram-type']

/** 阅读增强块：callout / 代码 chrome */
const ENRICH_ATTRS = ['data-callout', 'data-lang', 'data-decision']

/**
 * 净化由 Markdown 渲染出的 HTML。
 *
 * 重要：调用时机必须在所有字符串级后处理（如为标题注入 id）之后。
 * 那些 replace 会把捕获到的原始属性串原样搬回输出，若先净化再 replace，
 * 已被移除的危险属性可能被重新引入。
 *
 * blob: 协议放行说明：文档集阅读器把压缩包内图片转成 blob URL 后嵌入，
 * DOMPurify 默认 URI 白名单不含 blob:（会静默移除 src）。这里仅放行 blob:，
 * 不放开其他自定义协议。
 */
export function sanitizeMarkdownHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: SVG_TAGS,
    ADD_ATTR: [...SVG_ATTRS, ...DIAGRAM_ATTRS, ...ENRICH_ATTRS],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|blob):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    /*
     * 禁 form 系与 style：
     * - form/formaction 是提交型数据外发面
     * - style 允许 CSS 注入，且可用 position:fixed 铺满视口做点击劫持/钓鱼覆盖层，
     *   在“阅读他人分享文档”的场景下风险实际存在。
     *   marked 默认不产出 style，本站排版全部依赖 .md-preview 选择器，禁掉无副作用。
     *   SVG 的表现属性（fill / stroke 等）走 ADD_ATTR 白名单，不受影响。
     */
    FORBID_TAGS: ['form', 'input', 'button', 'textarea', 'select', 'option'],
    FORBID_ATTR: ['formaction', 'action', 'srcdoc', 'ping', 'style'],
  })
}

/**
 * 净化提示词展柜等场景下的 HTML（无需 SVG 图表支持，策略更紧）。
 */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['form', 'input', 'button', 'textarea', 'select', 'option', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['formaction', 'action', 'srcdoc', 'ping', 'style'],
  })
}
