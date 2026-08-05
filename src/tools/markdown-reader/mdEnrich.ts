/**
 * Markdown HTML 后处理：Callout / 段首标签 / 代码 chrome。
 * 全部失败时原样退回；不碰 AST，只做确定性字符串变换。
 */

const CALLOUT_META: Record<string, { className: string; title: string }> = {
  note: { className: 'md-callout-note', title: 'Note' },
  tip: { className: 'md-callout-tip', title: 'Tip' },
  important: { className: 'md-callout-important', title: 'Important' },
  warning: { className: 'md-callout-warning', title: 'Warning' },
  caution: { className: 'md-callout-caution', title: 'Caution' },
  决策: { className: 'md-callout-decision', title: '决策' },
  洞察: { className: 'md-callout-insight', title: '洞察' },
  坑: { className: 'md-callout-warning', title: '坑' },
}

const SLASH_COMMENT_LANGS = new Set([
  'js', 'javascript', 'ts', 'typescript', 'tsx', 'jsx',
  'c', 'cpp', 'cxx', 'h', 'hpp', 'java', 'go', 'rust', 'rs',
  'cs', 'csharp', 'kotlin', 'swift', 'scala',
])

const HASH_COMMENT_LANGS = new Set(['py', 'python', 'rb', 'ruby', 'sh', 'bash', 'zsh', 'yaml', 'yml', 'toml'])

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function resolveCallout(raw: string): { className: string; title: string; type: string } {
  const trimmed = raw.trim()
  const meta = CALLOUT_META[trimmed.toLowerCase()] ?? CALLOUT_META[trimmed]
  if (meta) return { ...meta, type: trimmed.toLowerCase() }
  return { className: 'md-callout-note', title: trimmed, type: trimmed.toLowerCase() }
}

/** `> [!NOTE]` / `> [!决策]` → aside.callout */
export function enrichCallouts(html: string): string {
  let decisionCalloutIndex = 0
  return html.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (full, inner: string) => {
    const marker = inner.match(/\[!([^\]]+)\]/)
    if (!marker) return full

    const meta = resolveCallout(marker[1])
    let body = inner.replace(marker[0], '')
    // 去掉只剩空白的首段外壳：<p></p> / <p><br></p>
    body = body.replace(/^\s*<p>\s*(?:<br\s*\/?>)?\s*<\/p>/i, '')
    body = body.replace(/^\s*<p>\s*/i, '<p>').replace(/<p>\s+/g, '<p>')

    const isDecision = meta.className === 'md-callout-decision'
    const idAttr = isDecision ? ` id="callout-decision-${decisionCalloutIndex++}"` : ''

    return (
      `<aside class="md-callout ${meta.className}" data-callout="${escapeAttr(meta.type)}"${idAttr}>` +
      `<div class="md-callout-title">${escapeHtml(meta.title)}</div>` +
      `<div class="md-callout-body">${body}</div>` +
      `</aside>`
    )
  })
}

/** 段首 `**标签**：` → badge（仅 `<p>` 开头） */
export function enrichLabelBadges(html: string): string {
  let decisionIndex = 0
  return html.replace(
    /<p(\s[^>]*)?>\s*<strong>([^<]{1,24})<\/strong>\s*([：:])/gi,
    (_full, attrs = '', label: string, sep: string) => {
      const isDecision = /待决策|决策点|未决/.test(label)
      const idAttr = isDecision ? ` id="decision-${decisionIndex++}"` : ''
      const decisionClass = isDecision ? ' md-label-decision' : ''
      return `<p${attrs}><span class="md-label-badge${decisionClass}"${idAttr}>${label}</span><span class="md-label-sep">${sep}</span>`
    },
  )
}

function deemphasizeComments(escapedCode: string, lang: string): string {
  if (SLASH_COMMENT_LANGS.has(lang)) {
    // ponytail: 不解析字符串字面量；误伤少见，真要准再换 tokenizer
    return escapedCode.replace(/(^|[^:&])(\/\/[^\n<]*)/gm, '$1<span class="md-code-comment">$2</span>')
  }
  if (HASH_COMMENT_LANGS.has(lang)) {
    return escapedCode.replace(/(^|[^&])(#[^\n<]*)/gm, '$1<span class="md-code-comment">$2</span>')
  }
  return escapedCode
}

/** 普通 fence → 语言标签 + 复制按钮容器；diagram 块应已先被抽走 */
export function enrichCodeChrome(html: string): string {
  return html.replace(
    /<pre><code(?:\s+class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/gi,
    (match, className = '', content: string) => {
      const langMatch = String(className).match(/\blanguage-([a-z0-9_+-]+)\b/i)
      const lang = (langMatch?.[1] ?? '').toLowerCase()
      if (lang === 'mermaid' || lang === 'plantuml' || lang === 'puml' || lang === 'graphviz' || lang === 'dot' || lang === 'decision') {
        return match
      }

      const label = lang || 'text'
      const body = deemphasizeComments(content, lang)
      const codeClass = className ? ` class="${className}"` : ''

      return (
        `<div class="md-code-block" data-lang="${escapeAttr(label)}">` +
        `<div class="md-code-chrome">` +
        `<span class="md-code-lang">${escapeHtml(label)}</span>` +
        `<span class="md-code-copy" role="button" tabindex="0" title="复制代码">复制</span>` +
        `</div>` +
        `<pre><code${codeClass}>${body}</code></pre>` +
        `</div>`
      )
    },
  )
}

/** 管道：diagram 之后、标题 id / sanitize 之前 */
export function enrichMarkdownHtml(html: string): string {
  let out = html
  out = enrichCodeChrome(out)
  out = enrichCallouts(out)
  out = enrichLabelBadges(out)
  out = enrichFootnotes(out)
  return out
}

export interface DecisionItem {
  id: string
  text: string
}

/** 从已增强 HTML 提取决策点（供侧栏聚合） */
export function extractDecisionItems(html: string): DecisionItem[] {
  const items: DecisionItem[] = []
  const badgeRe = /<span class="md-label-badge md-label-decision"[^>]*id="(decision-\d+)"[^>]*>([^<]*)<\/span>/gi
  let m: RegExpExecArray | null
  while ((m = badgeRe.exec(html)) !== null) {
    // 取 badge 后同段剩余文字做摘要
    const after = html.slice(m.index + m[0].length, m.index + m[0].length + 80)
    const snippet = after.replace(/<[^>]*>/g, '').replace(/^[：:\s]+/, '').trim()
    const text = snippet ? `${m[2]}：${snippet.slice(0, 36)}` : m[2]
    items.push({ id: m[1], text })
  }
  const calloutRe =
    /<aside class="md-callout md-callout-decision"[^>]*id="([^"]+)"[^>]*>[\s\S]*?<div class="md-callout-body">([\s\S]*?)<\/div>\s*<\/aside>/gi
  while ((m = calloutRe.exec(html)) !== null) {
    const bodyText = m[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    items.push({ id: m[1], text: bodyText.slice(0, 40) || '决策' })
  }
  const fenceRe =
    /<aside class="md-decision-panel"[^>]*id="([^"]+)"[^>]*>[\s\S]*?<div class="md-decision-title">([^<]*)<\/div>/gi
  while ((m = fenceRe.exec(html)) !== null) {
    items.push({ id: m[1], text: m[2] || '待决策' })
  }
  return items
}

/**
 * 脚注：`[^id^]` 引用 + `[^id^] 内容` 定义段。
 * 非标准语法（marked v5+ 不解析，原样穿透为文本），这里做确定性字符串变换。
 * 引用 → 上标数字链接；定义段（以 `[^id^] ` 开头的 <p>，段内多条定义按 `[^id^]` 边界切分）→ 文末列表 + 回跳。
 * 点击跳转由预览区 click 委托处理（见 MarkdownReaderTool）。
 */
export function enrichFootnotes(html: string): string {
  const defs: { n: number; content: string }[] = []
  const labelToN = new Map<string, number>()

  const stripped = html.replace(
    /<p>\s*\[\^([^\]^\s]+)\^\][\s\S]*?<\/p>/gi,
    (block) => {
      // 归一化 <br>，再按 [^id^] 边界切定义（不依赖硬换行/软换行/<br> 的具体形式）
      const norm = block
        .replace(/^<p>\s*/i, '')
        .replace(/\s*<\/p>$/i, '')
        .replace(/<br\s*\/?>/gi, '\n')
      let captured = false
      const defRe = /\[\^([^\]^\s]+)\^\]\s*([\s\S]*?)(?=\s*\[\^|$)/g
      let m: RegExpExecArray | null
      while ((m = defRe.exec(norm)) !== null) {
        const label = m[1]
        if (labelToN.has(label)) { captured = true; continue }
        const n = defs.length + 1
        labelToN.set(label, n)
        defs.push({ n, content: m[2].trim() })
        captured = true
      }
      return captured ? '' : block
    },
  )

  if (defs.length === 0) return html

  const withRefs = stripped.replace(
    /\[\^([^\]^\s]+)\^\]/g,
    (full, label: string) => {
      const n = labelToN.get(label)
      if (!n) return full
      return `<sup class="md-fnref" id="fnref-${n}"><a href="#fn-${n}" class="md-fnref-link">${n}</a></sup>`
    },
  )

  const listHtml =
    `<section class="md-footnotes" aria-label="脚注"><hr class="md-footnotes-sep"><ol>` +
    defs
      .map(
        (d) =>
          `<li id="fn-${d.n}">${d.content} <a href="#fnref-${d.n}" class="md-fn-back" aria-label="返回正文">↩</a></li>`,
      )
      .join('') +
    `</ol></section>`

  return withRefs + listHtml
}
