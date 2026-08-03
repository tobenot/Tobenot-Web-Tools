import { describe, expect, it } from 'vitest'
import { FENCE_UPGRADERS, resolveFenceLanguage, upgradeFenceBlocks } from './fenceUpgraders'

describe('resolveFenceLanguage', () => {
  it('归一别名', () => {
    expect(resolveFenceLanguage('puml')).toBe('plantuml')
    expect(resolveFenceLanguage('DOT')).toBe('graphviz')
    expect(resolveFenceLanguage('mermaid')).toBe('mermaid')
  })
})

describe('upgradeFenceBlocks', () => {
  it('升级 mermaid', () => {
    const out = upgradeFenceBlocks('<pre><code class="language-mermaid">graph TD</code></pre>')
    expect(out).toContain('class="mermaid"')
    expect(out).not.toContain('<pre>')
  })

  it('升级 plantuml 别名 puml', () => {
    const out = upgradeFenceBlocks('<pre><code class="language-puml">@startuml</code></pre>')
    expect(out).toContain('data-diagram-type="plantuml"')
    expect(out).toContain('kroki-source')
  })

  it('未知语言保持 pre', () => {
    const src = '<pre><code class="language-cpp">int x;</code></pre>'
    expect(upgradeFenceBlocks(src)).toBe(src)
  })

  it('注册表含核心图语言与 decision', () => {
    expect(Object.keys(FENCE_UPGRADERS).sort()).toEqual(['decision', 'graphviz', 'mermaid', 'plantuml'])
  })
})
