/**
 * Archive Reader（文档集阅读器）核心逻辑的单元测试。
 * 覆盖：路径解析 / 遍历防护 / 文件树构建 / 图片识别与校验 / 链接扫描与重写。
 */
import { describe, expect, it, beforeAll } from 'vitest'
import {
  hasTraversal,
  normalizeZipPath,
  resolvePath,
  buildTree,
  isMarkdownPath,
  isInnerImagePath,
  buildManifest,
  MAX_ENTRY_COUNT,
} from './archiveCore'
import { resolveLoadTarget, scanMarkdownLinks, validateImageBlob } from './contentLoader'
import { rewriteMarkdownLinks, encodeAdPath, decodeAdPath } from './linkRewriter'

/* jsdom 缺 URL.createObjectURL，validateImageBlob 依赖它 */
beforeAll(() => {
  if (!URL.createObjectURL) {
    Object.defineProperty(URL, 'createObjectURL', { writable: true, value: () => 'blob:test' })
    Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: () => {} })
  }
})

describe('normalizeZipPath', () => {
  it('清洗反斜杠与首尾斜杠，空路径返回 null', () => {
    expect(normalizeZipPath('a\\b\\c.md')).toBe('a/b/c.md')
    expect(normalizeZipPath('/a/b/')).toBe('a/b')
    expect(normalizeZipPath('')).toBe(null)
    expect(normalizeZipPath('///')).toBe(null)
  })
})

describe('hasTraversal', () => {
  it('允许正常相对路径', () => {
    expect(hasTraversal('docs/a.md')).toBe(false)
    expect(hasTraversal('a/./b')).toBe(false)
  })
  it('拒绝越界路径', () => {
    expect(hasTraversal('../secret.md')).toBe(true)
    expect(hasTraversal('a/../../x.md')).toBe(true)
  })
  it('允许同层 .. 消解（不越界）', () => {
    expect(hasTraversal('a/b/../c.md')).toBe(false)
  })
})

describe('buildManifest', () => {
  it('条目过多触发炸弹防护', () => {
    const entries = Array.from({ length: MAX_ENTRY_COUNT + 1 }, (_, i) => ({ path: `f${i}.md`, isDir: false }))
    expect(() => buildManifest(entries)).toThrow(/解压炸弹/)
  })
  it('越界路径整体拒绝', () => {
    expect(() => buildManifest([{ path: '../evil.md', isDir: false }])).toThrow(/越界路径/)
  })
  it('目录自动补全，文件按出现顺序保留', () => {
    const m = buildManifest([
      { path: 'docs/a.md', isDir: false },
      { path: 'docs/sub/b.md', isDir: false },
      { path: 'docs', isDir: true },
    ])
    expect(m.files.map((f) => f.path)).toEqual(['docs/a.md', 'docs/sub/b.md'])
    expect(m.dirs).toContain('docs')
    expect(m.dirs).toContain('docs/sub')
  })
})

describe('resolvePath', () => {
  it('相对与绝对路径解析', () => {
    expect(resolvePath('docs/a.md', './b.md')).toBe('docs/b.md')
    expect(resolvePath('docs/a.md', '../readme.md')).toBe('readme.md')
    expect(resolvePath('docs/a.md', '/readme.md')).toBe('readme.md')
    expect(resolvePath('docs/sub/a.md', '../../readme.md')).toBe('readme.md')
    expect(resolvePath('readme.md', '../x.md')).toBeNull() // 越出根
  })
  it('协议外 / 锚点引用不解析（由 resolveLoadTarget 拦截）', () => {
    expect(resolveLoadTarget('docs/a.md', '#anchor')).toBeNull()
    expect(resolveLoadTarget('docs/a.md', 'https://x.com/a.png')).toBeNull()
    expect(resolveLoadTarget('docs/a.md', 'data:image/png;base64,xxx')).toBeNull()
    expect(resolveLoadTarget('docs/a.md', '')).toBeNull()
  })
  it('query 与 fragment 尾巴保留在 target 之外', () => {
    const t = resolveLoadTarget('docs/a.md', './img.png?v=1#frag')
    expect(t).not.toBeNull()
    expect(t!.targetPath).toBe('docs/img.png')
    expect(t!.tail).toBe('?v=1#frag')
  })
})

describe('buildTree', () => {
  it('文件按目录分组，目录首现处插入', () => {
    const m = buildManifest([
      { path: 'docs/a.md', isDir: false },
      { path: 'docs/sub/b.md', isDir: false },
      { path: 'readme.md', isDir: false },
    ])
    const tree = buildTree(m.files, m.dirs)
    expect(tree.children.map((c) => c.name)).toEqual(['docs', 'readme.md'])
    const docs = tree.children[0]
    expect(docs.type).toBe('dir')
    expect(docs.children.map((c) => c.name)).toEqual(['a.md', 'sub'])
  })
})

describe('isMarkdownPath / isInnerImagePath', () => {
  it('识别 markdown 与图片扩展名', () => {
    expect(isMarkdownPath('a/b.MD')).toBe(true)
    expect(isMarkdownPath('a/b.markdown')).toBe(true)
    expect(isMarkdownPath('a/b.txt')).toBe(false)
    expect(isInnerImagePath('a/b.png')).toBe(true)
    expect(isInnerImagePath('a/b.PNG?v=1#frag')).toBe(true)
    expect(isInnerImagePath('a/b.svg')).toBe(true)
    expect(isInnerImagePath('a/b.jpeg')).toBe(true)
    expect(isInnerImagePath('a/b.txt')).toBe(false)
    expect(isInnerImagePath('https://x.com/a.png')).toBe(true) // 站外由 resolveLoadTarget 先拦
  })
})

describe('scanMarkdownLinks', () => {
  it('抓出图片与文档引用，忽略锚点', () => {
    const md = `![图](img/a.png "t")
[链接](./b.md)
[锚点](#x)
![](https://x.com/a.png)`
    const hrefs = scanMarkdownLinks(md).map((l) => l.href)
    expect(hrefs).toContain('img/a.png')
    expect(hrefs).toContain('./b.md')
    expect(hrefs).toContain('#x')
    expect(hrefs).toContain('https://x.com/a.png')
  })
})

describe('validateImageBlob', () => {
  it('类型白名单外拒绝', () => {
    const blob = new Blob(['x'], { type: 'text/plain' })
    const r = validateImageBlob(blob, 'text/plain')
    expect(r.ok).toBe(false)
  })
  it('未知类型放行（以内容为准，交给 <img> 自行判定）', () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: '' })
    const r = validateImageBlob(blob, '')
    expect(r.ok).toBe(true)
  })

  it('空文件拒绝', () => {
    const r = validateImageBlob(new Blob([]), 'image/png')
    expect(r.ok).toBe(false)
  })
})

describe('rewriteMarkdownLinks', () => {
  const mk = () => ({
    imageUrls: new Map([['docs/img.png', 'blob:doc1']]),
    docTargets: new Map([['docs/b.md', 'docs/b.md']]),
    fileNotes: new Map([['docs/data.json', 'docs/data.json']]),
    rootPath: 'docs/a.md',
  })

  it('图片替换为 blob URL，文档替换为哨兵锚点，未识别保持原样', () => {
    const { out } = rewriteMarkdownLinks(
      '![图](img.png)\n[开](b.md)\n[外](https://x.com)\n[数据](data.json)',
      mk(),
    )
    expect(out).toContain('![img.png](blob:doc1)')
    expect(out).toContain(encodeAdPath('doc', 'docs/b.md'))
    expect(out).toContain('https://x.com')
    expect(out).toContain(encodeAdPath('file', 'docs/data.json'))
  })

  it('哨兵锚点可逆编解码', () => {
    const enc = encodeAdPath('doc', 'docs/b.md')
    expect(decodeAdPath(enc)).toEqual({ role: 'doc', path: 'docs/b.md' })
    expect(decodeAdPath('#ad:file:612f62')).toEqual({ role: 'file', path: 'a/b' })
    expect(decodeAdPath('#not-ad')).toBeNull()
  })
})
