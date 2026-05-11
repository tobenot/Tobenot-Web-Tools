type SvgIconOptions = {
  bg: string
  fg: string
  text?: string
  innerSvg?: string
}

function svgToDataUri(svg: string) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function createFavicon({ bg, fg, text, innerSvg }: SvgIconOptions) {
  const content = innerSvg ?? `<text x="32" y="42" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" fill="${fg}">${text ?? ''}</text>`

  return svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${bg}"/>
  <path d="M12 16h40M12 48h40" stroke="rgba(255,255,255,.35)" stroke-width="4" stroke-linecap="round"/>
  ${content}
</svg>`.trim())
}

export const faviconMap: Record<string, string> = {
  '': createFavicon({ bg: '#0f172a', fg: '#ffffff', text: 'M' }),
  calendar: createFavicon({
    bg: '#2563eb',
    fg: '#ffffff',
    innerSvg: '<rect x="17" y="19" width="30" height="28" rx="4" fill="none" stroke="#fff" stroke-width="4"/><path d="M17 28h30M25 15v8M39 15v8" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="25" cy="36" r="2.5" fill="#fff"/><circle cx="32" cy="36" r="2.5" fill="#fff"/><circle cx="39" cy="36" r="2.5" fill="#fff"/>'
  }),
  'markdown-reader': createFavicon({ bg: '#7c3aed', fg: '#ffffff', text: 'Md' }),
  changelog: createFavicon({
    bg: '#ea580c',
    fg: '#ffffff',
    innerSvg: '<path d="M21 18h22M21 30h22M21 42h14" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="15" cy="18" r="2.5" fill="#fff"/><circle cx="15" cy="30" r="2.5" fill="#fff"/><circle cx="15" cy="42" r="2.5" fill="#fff"/>'
  }),
  about: createFavicon({ bg: '#0891b2', fg: '#ffffff', text: 'i' }),
}

export function setFavicon(routePath: string) {
  const href = faviconMap[routePath] ?? faviconMap['']
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')

  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }

  link.type = 'image/svg+xml'
  link.href = href
}
