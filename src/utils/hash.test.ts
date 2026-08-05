import { describe, expect, it, afterEach, vi } from 'vitest'
import { getRouteLocation, setStateHash } from './hash'

/*
 * hash.ts 是全站路由与「状态进链接」分享模型的基础。
 * 迁到路径路由后：路由取自 pathname，分享 payload 留在 fragment。
 * lz-string 的 URL 安全字母表含 '+' / '$'，解析行为一旦回退会静默破坏历史分享链接，
 * 故这里锁死 fragment 的解析契约。
 */

const original = window.location

function mockLocation(pathname: string, hash: string) {
  Object.defineProperty(window, 'location', {
    value: { ...original, pathname, hash },
    writable: true,
    configurable: true,
  })
}

afterEach(() => {
  Object.defineProperty(window, 'location', { value: original, writable: true, configurable: true })
  vi.restoreAllMocks()
})

describe('getRouteLocation', () => {
  it('根路径返回空 path', () => {
    mockLocation('/', '')
    expect(getRouteLocation().path).toBe('')
  })

  it('去掉首尾斜杠', () => {
    mockLocation('/calendar/', '')
    expect(getRouteLocation().path).toBe('calendar')
  })

  it('带连字符的路径名不被截断', () => {
    mockLocation('/space-tab-converter', '')
    expect(getRouteLocation().path).toBe('space-tab-converter')
  })

  it('从 fragment 解析分享参数', () => {
    mockLocation('/markdown-reader', '#c=ABC&style=business')
    const { path, params } = getRouteLocation()
    expect(path).toBe('markdown-reader')
    expect(params.get('c')).toBe('ABC')
    expect(params.get('style')).toBe('business')
  })

  it('未编码的 + 会被 URLSearchParams 解析成空格（lz-string 已知行为）', () => {
    // lz-string 的 decompress 会把空格还原成 +，故仍可正常解压
    mockLocation('/markdown-reader', '#c=A+B')
    expect(getRouteLocation().params.get('c')).toBe('A B')
  })

  it('保留 lz-string 字母表中的 $ 字符', () => {
    mockLocation('/markdown-reader', '#c=A$B')
    expect(getRouteLocation().params.get('c')).toBe('A$B')
  })

  it('参数值为空时返回空字符串而非 null', () => {
    mockLocation('/calendar', '#d=')
    expect(getRouteLocation().params.get('d')).toBe('')
  })
})

describe('setStateHash', () => {
  function spyPush() {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true)
    return vi.spyOn(window.history, 'pushState').mockImplementation(() => {})
  }

  it('把状态写进当前 pathname 的 fragment', () => {
    mockLocation('/calendar', '')
    const spy = spyPush()
    setStateHash({ d: '2026-07-30' })
    expect(spy).toHaveBeenCalledWith(null, '', '/calendar#d=2026-07-30')
  })

  it('跳过 undefined / null / 空字符串', () => {
    mockLocation('/calendar', '')
    const spy = spyPush()
    setStateHash({ a: undefined, b: null, c: '', d: 'ok' })
    expect(spy).toHaveBeenCalledWith(null, '', '/calendar#d=ok')
  })

  it('数字 0 不被当作空值跳过', () => {
    mockLocation('/calendar', '')
    const spy = spyPush()
    setStateHash({ n: 0 })
    expect(spy).toHaveBeenCalledWith(null, '', '/calendar#n=0')
  })
})
