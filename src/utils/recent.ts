import { isKnownRoute } from '../data/routes'

const STORAGE_KEY = 'mecha-recent-tools'
const MAX_RECENT = 5

/** 非工具页，不计入「最近使用」 */
const EXCLUDED = new Set(['', 'changelog', 'about'])

export function getRecentTools(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // 过滤掉已下线或拼错的 id，避免脏数据长期占用槽位
    return parsed.filter((id): id is string => typeof id === 'string' && isKnownRoute(id) && !EXCLUDED.has(id))
  } catch {
    return []
  }
}

export function recordToolVisit(id: string) {
  /*
   * 只记录已注册的工具路由：
   * 否则访问 #typo 之类的失效链接也会挤占「最近使用」的 5 个槽位。
   */
  if (!id || EXCLUDED.has(id) || !isKnownRoute(id)) return

  const recent = getRecentTools().filter((r) => r !== id)
  recent.unshift(id)
  try {
    // 无痕模式 / 配额满时 setItem 会抛异常。
    // 该函数在每次路由切换的 effect 里调用，异常会打断后续副作用，必须吞掉。
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
  } catch { /* ignore */ }
}
