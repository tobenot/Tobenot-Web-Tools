import { useEffect, useState } from 'react'

export function ShareButton() {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1200)
    return () => clearTimeout(t)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
    } catch {
      // ignore
    }
  }

  return (
    <button
      onClick={copy}
      className={`inline-flex items-center gap-2 px-4 py-2 border-2 font-medium transition-all duration-200 hover:scale-105 group rounded-mech ${
        copied
          ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300'
      }`}
    >
      <span className="text-base group-hover:scale-110 transition-transform duration-300">
        {copied ? '✅' : '🔗'}
      </span>
      <span className="font-medium">
        {copied ? '已复制' : '分享链接'}
      </span>
    </button>
  )
}
