/**
 * 从 zip 里读出文档/图片内容并校验的纯逻辑（与 React 解耦，便于单测）。
 */
import {
  MAX_TOTAL_BYTES,
  isMarkdownPath,
  isInnerImagePath,
  resolvePath,
  sanitizeDownloadName,
  safeAdd,
} from './archiveCore'

export interface ResolvedLoad {
  /** 规范化后的 zip 内绝对路径 */
  targetPath: string
  /** 原样 href（query/fragment 尾巴已剥除） */
  href: string
  /** 附带的 query/fragment 尾巴，保留供后续处理 */
  tail: string
}

export function resolveLoadTarget(currentPath: string, rawHref: string): ResolvedLoad | null {
  const raw = rawHref.trim()
  if (
    raw === '' ||
    raw.startsWith('#') ||
    raw.startsWith('?') ||
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('mailto:') ||
    raw.startsWith('data:') ||
    raw.startsWith('javascript:')
  ) {
    return null
  }
  const noTail = raw.split(/[?#]/, 1)[0]
  const tail = raw.slice(noTail.length)
  const targetPath = resolvePath(currentPath, noTail)
  if (!targetPath) return null
  return { targetPath, href: noTail, tail }
}

/** 校验图片 blob（类型 / 大小上限），返回可加载的 URL 或错误信息 */
export function validateImageBlob(
  blob: Blob,
  declaredType: string,
): { ok: true; url: string } | { ok: false; error: string } {
  if (blob.size === 0) return { ok: false, error: '文件为空' }
  if (blob.size > MAX_TOTAL_BYTES) {
    return { ok: false, error: `超过大小上限（${(MAX_TOTAL_BYTES / 1024 / 1024).toFixed(0)}MB）` }
  }
  const type = declaredType.split(';', 1)[0].toLowerCase()
  if (type !== '' && !type.startsWith('image/')) {
    return { ok: false, error: `非图片类型（${type || '未知'}）` }
  }
  try {
    return { ok: true, url: URL.createObjectURL(blob) }
  } catch {
    return { ok: false, error: '无法生成预览' }
  }
}

export interface LoadDocResult {
  path: string
  text: string
}

export interface LoadImageResult {
  path: string
  url: string | null
  error?: string
}

export interface LoaderHandles {
  readText: (path: string) => Promise<string>
  readImage: (path: string) => Promise<Blob | null>
}

export interface LoadResult {
  resolved: ResolvedLoad[]
  docs: LoadDocResult[]
  images: LoadImageResult[]
  skipped: Array<{ path: string; reason: string }>
  errors: Array<{ path: string; error: string }>
}

/**
 * 把原始 markdown 里的相对链接/图片引用解析为「zip 内路径」。
 * 规则：
 * - 站外/锚点/协议外 不动
 * - 非图片（md / 其他文件）：默认不可自动加载（点击跳文件树）——保持清单
 * - 图片扩展名：进入待加载图片清单
 */
export function scanMarkdownLinks(md: string): Array<{ href: string }> {
  const found: Array<{ href: string }> = []
  const re = /(?:!?\[[^\]]*\]\()([^)\s]+)(?:\s+"[^"]*")?\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(md)) !== null) found.push({ href: m[1] })
  return found
}

/**
 * 主入口：扫描 markdown 引用的相对路径 → 目标路径解析 → 图片读出 + 大小累计。
 * 返回统一结果对象，供 UI 层应用（替换 img src / 累加进度）。
 */
export async function loadLinkedTargets(
  currentPath: string,
  md: string,
  handles: LoaderHandles,
): Promise<LoadResult> {
  const links = scanMarkdownLinks(md)
  const resolved: ResolvedLoad[] = []
  const docs: LoadDocResult[] = []
  const images: LoadImageResult[] = []
  const skipped: Array<{ path: string; reason: string }> = []
  const errors: Array<{ path: string; error: string }> = []
  let totalBytes = 0

  const seen = new Set<string>()
  for (const link of links) {
    const target = resolveLoadTarget(currentPath, link.href)
    if (!target) continue
    if (seen.has(target.targetPath)) continue
    seen.add(target.targetPath)
    resolved.push(target)

    if (isInnerImagePath(target.href)) {
      const blob = await handles.readImage(target.targetPath)
      if (!blob) {
        errors.push({ path: target.targetPath, error: '图片不存在或不可读' })
        continue
      }
      totalBytes = safeAdd(totalBytes, blob.size)
      if (totalBytes > MAX_TOTAL_BYTES) {
        errors.push({ path: target.targetPath, error: '图片总量超过大小上限' })
        continue
      }
      const check = validateImageBlob(blob, blob.type || '')
      if (check.ok) {
        images.push({ path: target.targetPath, url: check.url })
      } else {
        errors.push({ path: target.targetPath, error: check.error })
      }
    } else if (isMarkdownPath(target.href)) {
      try {
        const text = await handles.readText(target.targetPath)
        docs.push({ path: target.targetPath, text })
      } catch (e) {
        errors.push({ path: target.targetPath, error: e instanceof Error ? e.message : '读取失败' })
      }
    } else {
      skipped.push({ path: target.targetPath, reason: '非 Markdown / 图片，请在文件树中打开' })
    }
  }

  return { resolved, docs, images, skipped, errors }
}

/** 展开文档内引用的 markdown 正文（递归，防环） */
export function expandDocChain(
  doc: LoadDocResult,
  readText: (path: string) => Promise<string>,
): Promise<{ text: string; expanded: Array<{ path: string; text: string }>; errors: Array<{ path: string; error: string }> }> {
  const expanded: Array<{ path: string; text: string }> = []
  const errors: Array<{ path: string; error: string }> = []
  const seen = new Set<string>([doc.path])

  async function walk(d: LoadDocResult): Promise<string> {
    let text = d.text
    const refs = scanMarkdownLinks(d.text)
    for (const ref of refs) {
      const target = resolveLoadTarget(d.path, ref.href)
      if (!target || !isMarkdownPath(target.href) || seen.has(target.targetPath)) continue
      seen.add(target.targetPath)
      try {
        const sub = await readText(target.targetPath)
        expanded.push({ path: target.targetPath, text: sub })
        text += '\n\n' + await walk({ path: target.targetPath, text: sub })
      } catch (e) {
        errors.push({ path: target.targetPath, error: e instanceof Error ? e.message : '读取失败' })
      }
    }
    return text
  }

  return walk(doc).then((text) => ({ text, expanded, errors }))
}
export function buildDownloadName(docPath: string): string {
  const base = docPath.split('/').pop() || 'document.md'
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return sanitizeDownloadName(base.replace(/\.(md|markdown|mdown|mkd)$/i, '') + `_${stamp}.md`)
}

/** 图片加载失败时的降级：返回「图片不可用」占位文案（不抛错） */
export function imageFallbackLabel(path: string): string {
  return `[图片无法加载：${path}]`
}
