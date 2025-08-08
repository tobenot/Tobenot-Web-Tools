export type HashLocation = { path: string; params: URLSearchParams }

export function getHashLocation(): HashLocation {
  let raw = window.location.hash || '#'
  if (raw.startsWith('#')) raw = raw.slice(1)
  const [path, query = ''] = raw.split('?')
  const params = new URLSearchParams(query)
  return { path: path || '', params }
}

export function setHash(path: string, params?: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams()
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && String(v) !== '') search.set(k, String(v))
    }
  }
  const q = search.toString()
  const h = q ? `#${path}?${q}` : `#${path}`
  if (window.location.hash !== h) window.location.hash = h
}