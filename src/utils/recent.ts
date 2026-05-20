const STORAGE_KEY = 'mecha-recent-tools'
const MAX_RECENT = 5

export function getRecentTools(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function recordToolVisit(id: string) {
  if (!id) return
  const recent = getRecentTools().filter(r => r !== id)
  recent.unshift(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}
