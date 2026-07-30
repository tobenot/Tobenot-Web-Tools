import { describe, expect, it, beforeEach } from 'vitest'
import { getRecentTools, recordToolVisit } from './recent'

const STORAGE_KEY = 'mecha-recent-tools'

describe('recent tools', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('无记录时返回空数组', () => {
    expect(getRecentTools()).toEqual([])
  })

  it('记录并读回已注册的工具', () => {
    recordToolVisit('calendar')
    expect(getRecentTools()).toEqual(['calendar'])
  })

  it('最近访问的排在最前', () => {
    recordToolVisit('calendar')
    recordToolVisit('base64')
    expect(getRecentTools()).toEqual(['base64', 'calendar'])
  })

  it('重复访问不产生重复项，且提到最前', () => {
    recordToolVisit('calendar')
    recordToolVisit('base64')
    recordToolVisit('calendar')
    expect(getRecentTools()).toEqual(['calendar', 'base64'])
  })

  it('最多保留 5 条', () => {
    for (const id of ['calendar', 'base64', 'url-codec', 'qrcode', 'text-diff', 'regex-tester']) {
      recordToolVisit(id)
    }
    const recent = getRecentTools()
    expect(recent).toHaveLength(5)
    expect(recent).not.toContain('calendar')
  })

  it('忽略未注册的路由，避免 #typo 挤占槽位', () => {
    recordToolVisit('definitely-not-a-tool')
    expect(getRecentTools()).toEqual([])
  })

  it('忽略首页与信息页', () => {
    recordToolVisit('')
    recordToolVisit('about')
    recordToolVisit('changelog')
    expect(getRecentTools()).toEqual([])
  })

  it('容忍损坏的 JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(getRecentTools()).toEqual([])
  })

  it('容忍非数组内容', () => {
    localStorage.setItem(STORAGE_KEY, '{"a":1}')
    expect(getRecentTools()).toEqual([])
  })

  it('过滤掉已下线的工具 id', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['calendar', 'removed-tool', 'base64']))
    expect(getRecentTools()).toEqual(['calendar', 'base64'])
  })

  it('过滤掉非字符串项', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['calendar', 42, null]))
    expect(getRecentTools()).toEqual(['calendar'])
  })
})
