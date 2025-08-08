export type HtmlAppMeta = {
  slug: string
  title: string
  description?: string
  version?: string
  updatedAt?: string
  tags?: string[]
  url?: string
}

/**
 * Discover HTML apps under `apps/<slug>/meta.json` and build a registry.
 * This runs at build/runtime via Vite's import.meta.glob, bundling small JSON metadata.
 */
export function getHtmlApps(): HtmlAppMeta[] {
  const modules = import.meta.glob('../apps/*/meta.json', { eager: true }) as Record<string, any>

  const apps: HtmlAppMeta[] = []
  const slugRegex = /\.\.\/apps\/([^/]+)\/meta\.json$/

  for (const [path, mod] of Object.entries(modules)) {
    const match = path.match(slugRegex)
    if (!match) continue
    const slug = match[1]
    const raw = (mod && (mod.default ?? mod)) || {}
    const title = String(raw.title || slug)
    const app: HtmlAppMeta = {
      slug,
      title,
      description: raw.description || undefined,
      version: raw.version || undefined,
      updatedAt: raw.updatedAt || undefined,
      tags: Array.isArray(raw.tags) ? raw.tags : undefined,
      url: `apps/${slug}/`,
    }
    apps.push(app)
  }

  // Sort by title for stable display
  apps.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans'))
  return apps
}