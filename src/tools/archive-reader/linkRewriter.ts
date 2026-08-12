/**
 * 把原始 markdown 中的相对引用重写为：
 * - 图片 → 可加载的 blob: URL
 * - 站内文档 / 站内其他文件 → 「#ad:<角色>:<hex 路径>」哨兵锚点
 *   （点击委托按角色行事：站内文档跳文件树，站内文件给提示）
 * 站外 / 锚点引用原样保留。纯字符串变换，与 React 解耦。
 */
import { resolveLoadTarget } from './contentLoader'

export interface RewriteOptions {
  /** href → blob: URL（图片） */
  imageUrls: Map<string, string>
  /** href → 站内文档相对路径 */
  docTargets: Map<string, string>
  /** href → 站内非文档文件的提示文案 */
  fileNotes: Map<string, string>
  /** 当前文档相对根目录的路径（用于解析相对引用） */
  rootPath: string
}

const PREFIX = 'ad:'

function hexEncode(s: string): string {
  let out = ''
  for (const ch of s) {
    const c = ch.codePointAt(0)
    out += c !== undefined ? c.toString(16) : ''
  }
  return out
}

export function encodeAdPath(role: 'doc' | 'file', path: string): string {
  return `#${PREFIX}${role}:${hexEncode(path)}`
}

export function decodeAdPath(hash: string): { role: 'doc' | 'file'; path: string } | null {
  const m = hash.match(/^#ad:(doc|file):([0-9a-f]+)$/)
  if (!m) return null
  let decoded = ''
  for (let i = 0; i < m[2].length; i += 2) {
    decoded += String.fromCodePoint(parseInt(m[2].slice(i, i + 2), 16))
  }
  return { role: m[1] as 'doc' | 'file', path: decoded }
}

/**
 * 重写 markdown 文本里的相对引用。
 * 返回值：重写后的文本 + 原样 href → 目标路径 的映射（供点击委托跳转用）。
 */
export function rewriteMarkdownLinks(
  md: string,
  opts: RewriteOptions,
): { out: string; docByHref: Map<string, string>; fileByHref: Map<string, string> } {
  const { imageUrls, docTargets, fileNotes, rootPath } = opts
  const docByHref = new Map<string, string>()
  const fileByHref = new Map<string, string>()

  const out = md.replace(
    /(!?\[[^\]]*\]\()([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (full, _altPart: string, hrefRaw: string) => {
      const target = resolveLoadTarget(rootPath, hrefRaw)
      if (!target) return full

      const imageUrl = imageUrls.get(target.targetPath)
      if (imageUrl) {
        const name = target.targetPath.split('/').pop() || 'image'
        return `![${escapeAttr(name)}](${imageUrl})`
      }
      const docPath = docTargets.get(target.targetPath)
      if (docPath) {
        docByHref.set(target.href, docPath)
        return `[${escapeAttr(docPath)}](${encodeAdPath('doc', docPath)})`
      }
      const note = fileNotes.get(target.targetPath)
      if (note) {
        fileByHref.set(target.href, target.targetPath)
        return `[${escapeAttr(note)}](${encodeAdPath('file', target.targetPath)})`
      }
      return full
    },
  )

  return { out, docByHref, fileByHref }
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}
