import { useState } from 'react'

const STORAGE_KEY = 'mecha-domain-migration-banner'

export function DomainMigrationBanner() {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== '1'
    } catch {
      return true
    }
  })

  if (!visible) return null

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
    setVisible(false)
  }

  return (
    <div className="border-b-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40">
      <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-start sm:items-center gap-3 text-sm text-amber-900 dark:text-amber-100">
        <span className="shrink-0" aria-hidden>📢</span>
        <p className="flex-1 leading-relaxed">
          本站已迁至{' '}
          <a
            href="https://tools.tobenot.top/"
            className="font-medium underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-200"
          >
            tools.tobenot.top
          </a>
          。tobenot.top/Tobenot-Web-Tools/ 的旧链接仍会跳转，请更新书签。
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 px-2 py-1 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
          style={{ borderRadius: '2px' }}
          aria-label="关闭通知"
        >
          关闭
        </button>
      </div>
    </div>
  )
}
