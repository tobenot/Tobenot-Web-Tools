/*
 * 运行时 CDN 脚本加载。
 *
 * 本站刻意不把 marked / mermaid / html2canvas / lz-string 放进 npm 依赖，
 * 而是按需从 CDN 拉取，以保持主 bundle 精简。
 *
 * 两条硬性约定（见 docs/architecture.md 设计取舍）：
 * 1. 所有地址必须钉死具体版本号。分享链接是长期契约，
 *    上游 latest 的破坏性变更会静默破坏历史链接的渲染。
 * 2. 尽可能带上 SRI（integrity），确保 CDN 被投毒时脚本不会执行。
 */

export interface ScriptSource {
  src: string
  /** Subresource Integrity 摘要，形如 `sha384-...` */
  integrity?: string
}

const loaded = new Map<string, Promise<void>>()

export function loadScript(source: string | ScriptSource): Promise<void> {
  const { src, integrity } = typeof source === 'string' ? { src: source, integrity: undefined } : source

  const cached = loaded.get(src)
  if (cached) return cached

  const pending = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.loaded = 'false'
    if (integrity) {
      script.integrity = integrity
      script.crossOrigin = 'anonymous'
    }
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })

  // 失败后允许重试：不缓存被拒绝的 promise
  pending.catch(() => loaded.delete(src))
  loaded.set(src, pending)
  return pending
}

/* ─── 钉死版本的 CDN 清单 ─── */

export const CDN = {
  marked: {
    src: 'https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js',
    integrity: 'sha384-H+hy9ULve6xfxRkWIh/YOtvDdpXgV2fmAGQkIDTxIgZwNoaoBal14Di2YTMR6MzR',
  },
  mermaid: {
    src: 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js',
    integrity: 'sha384-WmdflGW9aGfoBdHc4rRyWzYuAjEmDwMdGdiPNacbwfGKxBW/SO6guzuQ76qjnSlr',
  },
  html2canvas: {
    src: 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    integrity: 'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H',
  },
  /*
   * lz-string 承载即时链接（?c=）的压缩/解压，
   * 生成端与解析端必须严格同版本同函数对，绝不可升级。
   */
  lzString: {
    src: 'https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js',
    integrity: 'sha384-0d+Gr7vM4Drod8E3hXKgciWJSWbjD/opKLLygI9ktiWbuvlDwQLzU46wJ9s5gsp7',
  },
} as const satisfies Record<string, ScriptSource>
