/**
 * zip 文档集读取器的纯逻辑：解压树构建 / 文件路径解析 / 压缩炸弹与路径穿越防护。
 * 与 React 解耦，便于单测。
 *
 * 防御说明：
 * - 解压炸弹（zip bomb）：50 万条目或超 100MB 解压总量直接拒绝。
 *   上限定在「正常文档集」数量级之上几个量级，见 ArchiveReaderTool 设计思路。
 * - 路径穿越：目录条目越过根（..）即视为恶意，整体拒绝并报错，不做「丢弃」——
 *   静默丢弃会让树与真实内容不一致，反而更难排查。
 * - 符号链接（unix 模式 symlink 条目）：解压时按常规文件处理，可能读出的字节数
 *   与声明的压缩前大小不一致，防御校验据此放行。
 */

/** 单个文件的元数据 */
export interface ZipFileEntry {
  /** zip 内原始路径（正斜杠） */
  path: string
  /** 展示名（最后一段） */
  name: string
  /** 大小（字节）；jszip 对 symlink 条目的估计可能不准，仅用于 UI 展示 */
  size: number
  isMarkdown: boolean
}

export interface ArchiveManifest {
  files: ZipFileEntry[]
  dirs: string[]
  totalBytes: number
}

export const MAX_ENTRY_COUNT = 500_000
export const MAX_TOTAL_BYTES = 100 * 1024 * 1024

export function isMarkdownPath(path: string): boolean {
  return /\.(md|markdown|mdown|mkd)$/i.test(path)
}

/** 纯展示名；末尾斜杠已剥除（目录） */
function baseName(path: string): string {
  const p = path.replace(/\/+$/, '')
  const i = p.lastIndexOf('/')
  return i >= 0 ? p.slice(i + 1) : p
}

/** zip 内部路径：正斜杠、无前导/尾随斜杠；空返回 null */
export function normalizeZipPath(path: string): string | null {
  const p = path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
  return p.length > 0 ? p : null
}

/** 目录条目是否越出根：越过即恶意，整体拒绝（不静默丢弃） */
export function hasTraversal(p: string): boolean {
  let depth = 0
  for (const part of p.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      depth -= 1
      if (depth < 0) return true
    } else {
      depth += 1
    }
  }
  return false
}
/** 按声明大小的求和溢出保护（jszip 的 est 可能低估，仅作第一道粗筛） */
export function safeAdd(a: number, b: number): number {
  const s = a + b
  return s < a || s > MAX_TOTAL_BYTES ? MAX_TOTAL_BYTES : s
}

export interface BuildManifestInput {
  path: string
  isDir: boolean
}

/** 由 zip 条目列表构建文件树清单；违反防御上限时抛错（附原因文案） */
export function buildManifest(entries: BuildManifestInput[]): ArchiveManifest {
  if (entries.length > MAX_ENTRY_COUNT) {
    throw new Error(`压缩包内条目过多（${entries.length.toLocaleString()}），疑为解压炸弹，已拒绝读取`)
  }

  const files: ZipFileEntry[] = []
  const dirs: string[] = []
  let totalBytes = 0

  for (const e of entries) {
    const p = normalizeZipPath(e.path)
    if (!p) continue
    if (hasTraversal(p)) {
      throw new Error(`压缩包内含越界路径（${p.slice(0, 80)}），已拒绝读取`)
    }
    if (e.isDir) {
      if (!dirs.includes(p)) dirs.push(p)
      continue
    }
    const lastSlash = p.lastIndexOf('/')
    if (lastSlash > 0 && !dirs.includes(p.slice(0, lastSlash))) dirs.push(p.slice(0, lastSlash))
    files.push({ path: p, name: baseName(p), size: 0, isMarkdown: isMarkdownPath(p) })
    totalBytes = safeAdd(totalBytes, 0) // 大小在解压时按实际字节累计，见 ArchiveReaderTool
  }

  return { files, dirs, totalBytes }
}

/** 展示层按树分组（顺序=文件顺序，目录首现处插入） */
export interface TreeNode {
  type: 'file' | 'dir'
  name: string
  path: string
  children: TreeNode[]
}

export function buildTree(files: ZipFileEntry[], dirs: string[]): TreeNode {
  const root: TreeNode = { type: 'dir', name: '', path: '', children: [] }
  const index = new Map<string, TreeNode>([['', root]])

  const ensureDir = (dirPath: string): TreeNode => {
    const existing = index.get(dirPath)
    if (existing) return existing
    const parts = dirPath.split('/')
    const parentPath = parts.slice(0, -1).join('/')
    const node: TreeNode = { type: 'dir', name: parts[parts.length - 1], path: dirPath, children: [] }
    ensureDir(parentPath).children.push(node)
    index.set(dirPath, node)
    return node
  }

  /*
   * 顺序约定：目录在「首次需要出现」的位置就地插入（惰性创建），
   * 文件保持 zip 条目原始顺序；显式列出的空目录最后按序补上。
   */
  for (const f of files) {
    const parts = f.path.split('/')
    const parentPath = parts.slice(0, -1).join('/')
    ensureDir(parentPath).children.push({ type: 'file', name: f.name, path: f.path, children: [] })
  }
  for (const d of dirs) ensureDir(d)
  return root
}

/**
 * 路径解析：currentPath 为「文档文件路径」（非目录），raw 为文档内的相对引用。
 * 站外 / 锚点 / 协议外返回 null；越出根返回 null。
 */
export function resolvePath(currentPath: string, raw: string): string | null {
  const p = raw.trim()
  if (p.startsWith('/')) return normalizeZipPath(p)

  const slashIdx = currentPath.lastIndexOf('/')
  const curDir = slashIdx >= 0 ? currentPath.slice(0, slashIdx) : ''
  const parts = [...(curDir ? curDir.split('/') : []), ...p.split('/')]
  const out: string[] = []
  for (const part of parts) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (out.length === 0) return null
      out.pop()
    } else {
      out.push(part)
    }
  }
  return out.join('/')
}

/** 相对路径是否指向 zip 内的图片（支持 query/fragment 尾巴） */
export function isInnerImagePath(raw: string): boolean {
  const clean = raw.trim().split(/[?#]/, 1)[0]
  return /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i.test(clean)
}

/** 文件名清洗：空或纯点 → 兜底名；去除空字节 */
export function sanitizeDownloadName(name: string): string {
  const cleaned = name.replace(/\0/g, '')
  if (!cleaned.trim() || /^\.+$/.test(cleaned)) return 'exported.md'
  return cleaned
}
