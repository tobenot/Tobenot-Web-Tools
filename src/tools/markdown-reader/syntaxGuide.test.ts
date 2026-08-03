import { describe, expect, it } from 'vitest'
import { SYNTAX_GUIDE_ITEMS, buildSyntaxGuideMarkdown } from './syntaxGuide'

describe('syntaxGuide', () => {
  it('每项都有可复制示例', () => {
    expect(SYNTAX_GUIDE_ITEMS.length).toBeGreaterThan(0)
    for (const item of SYNTAX_GUIDE_ITEMS) {
      expect(item.example.trim().length).toBeGreaterThan(0)
      expect(item.status).toBeTruthy()
    }
  })

  it('全文速查包含决策与 Callout', () => {
    const md = buildSyntaxGuideMarkdown()
    expect(md).toContain('```decision')
    expect(md).toContain('[!洞察]')
    expect(md).toContain('mermaid')
  })
})
