import { describe, expect, it } from 'vitest'
import {
  enrichCallouts,
  enrichCodeChrome,
  enrichFootnotes,
  enrichLabelBadges,
  enrichMarkdownHtml,
  extractDecisionItems,
} from './mdEnrich'

describe('enrichCallouts', () => {
  it('把 [!NOTE] 引用转成 callout', () => {
    const html = '<blockquote><p>[!NOTE]<br>\n这是说明</p></blockquote>'
    const out = enrichCallouts(html)
    expect(out).toContain('md-callout-note')
    expect(out).toContain('data-callout="note"')
    expect(out).toContain('这是说明')
    expect(out).not.toContain('<blockquote>')
  })

  it('支持中文 [!决策]', () => {
    const html = '<blockquote><p>[!决策]</p><p>选 A 还是 B</p></blockquote>'
    const out = enrichCallouts(html)
    expect(out).toContain('md-callout-decision')
    expect(out).toContain('id="callout-decision-0"')
    expect(out).toContain('选 A 还是 B')
  })

  it('普通引用保持不动', () => {
    const html = '<blockquote><p>普通引用</p></blockquote>'
    expect(enrichCallouts(html)).toBe(html)
  })
})

describe('enrichLabelBadges', () => {
  it('段首加粗标签变 badge', () => {
    const out = enrichLabelBadges('<p><strong>注意</strong>：别忘了清缓存</p>')
    expect(out).toContain('md-label-badge')
    expect(out).toContain('注意')
    expect(out).toContain('别忘了清缓存')
  })

  it('待决策带 id 供聚合', () => {
    const out = enrichLabelBadges('<p><strong>待决策</strong>：归属问题</p>')
    expect(out).toContain('md-label-decision')
    expect(out).toContain('id="decision-0"')
  })
})

describe('enrichCodeChrome', () => {
  it('给代码块加 chrome', () => {
    const out = enrichCodeChrome('<pre><code class="language-cpp">int x; // note</code></pre>')
    expect(out).toContain('md-code-block')
    expect(out).toContain('md-code-lang')
    expect(out).toContain('>cpp<')
    expect(out).toContain('md-code-copy')
    expect(out).toContain('md-code-comment')
  })

  it('跳过尚未抽走的 mermaid fence', () => {
    const src = '<pre><code class="language-mermaid">graph TD</code></pre>'
    expect(enrichCodeChrome(src)).toBe(src)
  })
})

describe('enrichMarkdownHtml + extractDecisionItems', () => {
  it('管道可组合且能抽出决策', () => {
    const html = [
      '<blockquote><p>[!决策]</p><p>三选一</p></blockquote>',
      '<p><strong>待决策</strong>：生命归属</p>',
      '<pre><code class="language-js">x // c</code></pre>',
    ].join('')
    const out = enrichMarkdownHtml(html)
    expect(out).toContain('md-callout-decision')
    expect(out).toContain('md-label-decision')
    expect(out).toContain('md-code-block')

    const decisions = extractDecisionItems(out)
    expect(decisions.length).toBeGreaterThanOrEqual(2)
    expect(decisions.some((d) => d.id.startsWith('decision-'))).toBe(true)
  })
})

describe('enrichFootnotes', () => {
  it('引用 + 定义 → 上标链接 + 文末列表', () => {
    const html = ['<p>正文[^A-01^]。</p>', '<p>[^A-01^] 参见某文档。</p>'].join('')
    const out = enrichFootnotes(html)
    expect(out).toContain('class="md-fnref"')
    expect(out).toContain('href="#fn-1"')
    expect(out).toContain('id="fnref-1"')
    expect(out).toContain('class="md-footnotes"')
    expect(out).toContain('id="fn-1"')
    expect(out).toContain('参见某文档')
    expect(out).toContain('md-fn-back')
    expect(out).not.toContain('[^A-01^]')
  })

  it('无定义的引用保留原文', () => {
    const out = enrichFootnotes('<p>正文[^X^]。</p>')
    expect(out).toContain('[^X^]')
    expect(out).not.toContain('md-footnotes')
  })

  it('无脚注时原样返回', () => {
    const html = '<p>普通正文。</p>'
    expect(enrichFootnotes(html)).toBe(html)
  })

  it('同一 <p> 内 <br> 分隔的多条定义', () => {
    const html = '<p>正文[^A^][^B^]。</p><p>[^A^] 内容A<br>[^B^] 内容B</p>'
    const out = enrichFootnotes(html)
    expect(out).toContain('href="#fn-1"')
    expect(out).toContain('href="#fn-2"')
    expect(out).toContain('内容A')
    expect(out).toContain('内容B')
    expect(out).not.toContain('[^A^]')
    expect(out).not.toContain('[^B^]')
  })

  it('软换行（无 <br>，marked 默认输出）的多条定义也能切分', () => {
    const html = '<p>正文[^A^][^B^]。</p><p>[^A^] 内容A\n[^B^] 内容B</p>'
    const out = enrichFootnotes(html)
    expect(out).toContain('href="#fn-1"')
    expect(out).toContain('href="#fn-2"')
    expect(out).toContain('内容A')
    expect(out).toContain('内容B')
    expect(out).not.toContain('[^A^]')
    expect(out).not.toContain('[^B^]')
  })

  it('定义段以 <p>[^id^] 开头才识别，正文中的 [^id^] 不误判为定义', () => {
    const html = '<p>这里是[^A^]引用。</p><p>普通段落。</p>'
    const out = enrichFootnotes(html)
    // 无定义段，引用保留原文，不生成列表
    expect(out).toContain('[^A^]')
    expect(out).not.toContain('md-footnotes')
  })
})
