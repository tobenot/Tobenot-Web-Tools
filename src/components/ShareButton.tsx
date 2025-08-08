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
    <button onClick={copy} className="inline-flex items-center gap-2 px-3 py-2 rounded-[3px] border border-mech-edge bg-white hover:bg-neutral-50 text-mech-text transition-colors">
      <span>{copied ? '✅' : '🔗'}</span>
      <span>{copied ? '已复制' : '分享'}</span>
    </button>
  )
}