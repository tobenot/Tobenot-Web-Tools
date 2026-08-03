import { describe, expect, it, beforeEach } from 'vitest'
import { parseDecisionFence, renderDecisionFence, resetDecisionFenceSeq } from './decisionFence'

beforeEach(() => resetDecisionFenceSeq())

describe('parseDecisionFence', () => {
  it('解析标题、选项与备注', () => {
    const parsed = parseDecisionFence([
      '+1 生命的归属',
      '- 玩家：吸血流',
      '- 本剑：越战越肉',
      '- 整簇：共享池',
      '> 架构都支持',
    ].join('\n'))

    expect(parsed.title).toBe('+1 生命的归属')
    expect(parsed.options).toHaveLength(3)
    expect(parsed.options[0]).toEqual({ label: '玩家', detail: '吸血流' })
    expect(parsed.note).toBe('架构都支持')
  })

  it('支持 pipe 写法', () => {
    const parsed = parseDecisionFence('标题\nA | 说明A\nB | 说明B')
    expect(parsed.title).toBe('标题')
    expect(parsed.options).toEqual([
      { label: 'A', detail: '说明A' },
      { label: 'B', detail: '说明B' },
    ])
  })
})

describe('renderDecisionFence', () => {
  it('产出决策面板 HTML', () => {
    const html = renderDecisionFence('+1 生命\n- 玩家：吸血\n- 本剑：成长')
    expect(html).toContain('md-decision-panel')
    expect(html).toContain('id="fence-decision-0"')
    expect(html).toContain('data-decision="true"')
    expect(html).toContain('+1 生命')
    expect(html).toContain('玩家')
    expect(html).not.toMatch(/\sstyle\s*=/)
  })
})
