import { useEffect, useState } from 'react'

/**
 * Service Worker 更新提示。
 *
 * SW 采用 stale-while-revalidate，新版本要到下一次访问才生效——
 * 用户会一直慢一个版本且毫无感知。这里在检测到新 SW 就位后显式提示，
 * 由用户决定何时刷新。
 *
 * 之所以不自动 skipWaiting + reload：代码分割后页面已加载的
 * chunk 引用旧文件名，静默换版会导致后续懒加载 404。
 */
export function UpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let cancelled = false

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg || cancelled) return

      // 打开页面时已有新版本在等待
      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(reg.waiting)
      }

      reg.addEventListener('updatefound', () => {
        const installing = reg.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          // 仅在已有 controller 时提示，避免首次安装也弹窗
          if (installing.state === 'installed' && navigator.serviceWorker.controller && !cancelled) {
            setWaitingWorker(installing)
          }
        })
      })
    })

    return () => { cancelled = true }
  }, [])

  if (!waitingWorker) return null

  const worker = waitingWorker

  function applyUpdate() {
    worker.postMessage('SKIP_WAITING')
    // 新 SW 接管后再刷新，确保拿到的是同一版资源
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9995] max-w-sm">
      <div className="flex items-start gap-3 p-4 border-2 border-blue-400 dark:border-blue-500 bg-white dark:bg-gray-800 shadow-lg rounded-mech">
        <span className="text-lg leading-none mt-0.5">🚀</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">有新版本可用</p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            刷新后即可使用最新版本的工具。
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={applyUpdate}
              className="px-3 py-1.5 text-xs font-semibold border-2 border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700 transition-colors rounded-mech"
            >
              立即刷新
            </button>
            <button
              type="button"
              onClick={() => setWaitingWorker(null)}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              稍后
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
