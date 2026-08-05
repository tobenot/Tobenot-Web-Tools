export type RouteLocation = { path: string; params: URLSearchParams }

/*
 * 路由取自 pathname，状态（「状态进链接」的分享 payload）取自 fragment。
 * 拆分的意义：pathname 可被爬虫/预渲染看到（按工具出 OG），
 * 而分享 payload 留在 fragment —— lz-string 的字母表含 '+' / '$'，
 * 放 fragment 才不被服务器/URLSearchParams 改写，历史分享链接不受影响。
 * fragment 仍用 URLSearchParams 解析：'+' 会被当空格，但 decompress 会还原（见 hash.test.ts）。
 */
export function getRouteLocation(): RouteLocation {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '')
  const frag = window.location.hash.replace(/^#/, '')
  return { path, params: new URLSearchParams(frag) }
}

function apply(target: string) {
  const current = window.location.pathname + window.location.hash
  if (target === current) return
  const pathChanged = target.split('#')[0] !== window.location.pathname
  window.history.pushState(null, '', target)
  window.dispatchEvent(new Event('popstate'))
  if (pathChanged) window.scrollTo(0, 0)
}

/** SPA 导航到某路径（可带 '#state'）。通知 App 重渲染。 */
export function navigate(to: string) {
  apply(to.startsWith('/') ? to : '/' + to)
}

/**
 * 把状态写进当前 pathname 的 fragment，用于「状态进链接」分享。
 * 跳过 undefined / null / 空串；数字转字符串（0 保留）。
 */
export function setStateHash(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v) !== '') search.set(k, String(v))
  }
  const q = search.toString()
  apply(window.location.pathname + (q ? '#' + q : ''))
}
