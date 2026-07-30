import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { getHashLocation, setHash } from './hash'

/*
 * hash.ts 是全站路由与「状态进链接」分享模型的基础，
 * 尤其 lz-string 的 URL 安全字母表含 '+' / '$'，
 * 解析行为一旦回退会静默破坏所有历史分享链接。
 */

const originalLocation = window.location

function mockHash(hash: string) {
  Object.defineProperty(window, 'location', {
    value: { ...originalLocation, hash },
    writable: true,
    configurable: true,
  })
}

describe('getHashLocation', () => {
  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
  })

  it('空 hash 返回空 path', () => {
    mockHash('')
    expect(getHashLocation().path).toBe('')
  })

  it('仅 # 返回空 path', () => {
    mockHash('#')
    expect(getHashLocation().path).toBe('')
  })

  it('解析简单路径', () => {
    mockHash('#calendar')
    expect(getHashLocation().path).toBe('calendar')
  })

  it('解析路径与查询参数', () => {
    mockHash('#calendar?d=2026-07-30')
    const { path, params } = getHashLocation()
    expect(path).toBe('calendar')
    expect(params.get('d')).toBe('2026-07-30')
  })

  it('解析多个参数', () => {
    mockHash('#markdown-reader?c=ABC&style=business')
    const { path, params } = getHashLocation()
    expect(path).toBe('markdown-reader')
    expect(params.get('c')).toBe('ABC')
    expect(params.get('style')).toBe('business')
  })

  it('带连字符的路径名不被截断', () => {
    mockHash('#space-tab-converter')
    expect(getHashLocation().path).toBe('space-tab-converter')
  })

  it('未编码的 + 会被 URLSearchParams 解析成空格（lz-string 已知行为）', () => {
    // 该行为是 architecture.md 记录的已知边界：
    // lz-string 的 decompress 会把空格还原成 +，故仍可正常解压
    mockHash('#markdown-reader?c=A+B')
    expect(getHashLocation().params.get('c')).toBe('A B')
  })

  it('保留 lz-string 字母表中的 $ 字符', () => {
    mockHash('#markdown-reader?c=A$B')
    expect(getHashLocation().params.get('c')).toBe('A$B')
  })

  it('参数值为空时返回空字符串而非 null', () => {
    mockHash('#calendar?d=')
    expect(getHashLocation().params.get('d')).toBe('')
  })
})

describe('setHash', () => {
  beforeEach(() => {
    mockHash('')
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
  })

  it('无参数时只写路径', () => {
    setHash('calendar')
    expect(window.location.hash).toBe('#calendar')
  })

  it('写入参数', () => {
    setHash('calendar', { d: '2026-07-30' })
    expect(window.location.hash).toBe('#calendar?d=2026-07-30')
  })

  it('跳过 undefined / null / 空字符串', () => {
    setHash('calendar', { a: undefined, b: null, c: '', d: 'ok' })
    expect(window.location.hash).toBe('#calendar?d=ok')
  })

  it('数字参数转为字符串', () => {
    setHash('calendar', { year: 2026 })
    expect(window.location.hash).toBe('#calendar?year=2026')
  })

  it('数字 0 不被当作空值跳过', () => {
    setHash('calendar', { n: 0 })
    expect(window.location.hash).toBe('#calendar?n=0')
  })
})
