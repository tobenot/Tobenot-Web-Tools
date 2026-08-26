import { describe, expect, it } from 'vitest'
import { groupToolsByCategory, isToolCategory, matchesToolQuery, type ToolCategory } from './catalog'

const image = { title: '图片转 WebP', description: '批量转换', tags: ['WebP'], category: 'image' as const }
const codec = { title: 'Base64 编解码', description: '文本与文件', tags: ['base64'], category: 'codec' as const }
const orphan: { title: string; description: string; category?: ToolCategory } = {
  title: '更新日志',
  description: '站点记录',
}

describe('catalog', () => {
  it('只接受已登记的分组 id', () => {
    expect(isToolCategory('image')).toBe(true)
    expect(isToolCategory('utility')).toBe(false)
    expect(isToolCategory('')).toBe(false)
  })

  it('按标题、标签、分组名都能搜到', () => {
    expect(matchesToolQuery(image, 'webp')).toBe(true)
    expect(matchesToolQuery(image, '图片')).toBe(true)
    expect(matchesToolQuery(codec, 'base64')).toBe(true)
    expect(matchesToolQuery(codec, '编码')).toBe(true)
    expect(matchesToolQuery(image, '正则')).toBe(false)
  })

  it('空查询不过滤；无分组的条目不进任何组', () => {
    expect(matchesToolQuery(orphan, '')).toBe(true)
    expect(groupToolsByCategory([image, codec, orphan]).map((g) => g.id)).toEqual(['image', 'codec'])
  })
})
