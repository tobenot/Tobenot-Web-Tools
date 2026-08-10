// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { batSections, buildBat, type BatOptions } from './batBuilder'

describe('buildBat', () => {
  it('把路径里的 % 转义成 %%', () => {
    const bat = buildBat({ src: 'C:\\50% off\\机密', out: '', level: 'max', encryptNames: true })
    expect(bat).toContain('set "SRC=C:\\50%% off\\机密"')
  })

  it('按压缩级别映射 -mx', () => {
    expect(buildBat({ src: 'x', out: '', level: 'fast', encryptNames: true })).toContain('-mx=1')
    expect(buildBat({ src: 'x', out: '', level: 'normal', encryptNames: true })).toContain('-mx=5')
    expect(buildBat({ src: 'x', out: '', level: 'max', encryptNames: true })).toContain('-mx=9')
  })

  it('控制 -mhe 开关', () => {
    expect(buildBat({ src: 'x', out: '', level: 'max', encryptNames: true })).toContain('-mhe=on')
    expect(buildBat({ src: 'x', out: '', level: 'max', encryptNames: false })).toContain('-mhe=off')
  })

  it('预设输出路径会写进脚本', () => {
    const bat = buildBat({ src: 'C:\\src', out: 'D:\\backup.7z', level: 'max', encryptNames: true })
    expect(bat).toContain('set "OUT=D:\\backup.7z"')
  })

  it('输出留空时保留运行时推导逻辑，源路径留空时保留交互输入兜底', () => {
    const bat = buildBat({ src: '', out: '', level: 'max', encryptNames: true })
    expect(bat).toContain('for %%F in ("%SRC%") do set "OUT=%%~dpF%%~nF_!TS!.7z"')
    expect(bat).toContain('Drag a file/folder onto this script, or type a path')
  })

  it('模板里不应残留未插值的 JS 占位符', () => {
    const bat = buildBat({ src: 'x', out: '', level: 'max', encryptNames: true })
    expect(bat).not.toContain('${')
  })

  it('必须是 CRLF 换行，否则 cmd 解析 & / && 会出错', () => {
    const bat = buildBat({ src: 'x', out: '', level: 'max', encryptNames: true })
    expect(bat).toContain('\r\n')
    expect(bat.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('正文必须纯 ASCII，否则中文系统 cmd 按 GBK 误读 UTF-8 中文会乱码/报错', () => {
    const bat = buildBat({ src: 'x', out: '', level: 'max', encryptNames: true })
    expect(bat.split('\r\n')[0]).toBe('@echo off')
    expect([...bat].every((c) => c.charCodeAt(0) < 128)).toBe(true)
  })

  it('src/out 为空时省略预设赋值行，脚本改为运行时输入', () => {
    const bat = buildBat({ src: '', out: '', level: 'max', encryptNames: true })
    expect(bat).not.toContain('set "SRC="')
    expect(bat).not.toContain('set "OUT="')
  })
})

describe('batSections', () => {
  it('区块拼接与 buildBat 产物完全一致（单一事实源，展示与下载不漂移）', () => {
    const o: BatOptions = { src: 'C:\\a', out: 'D:\\b.7z', level: 'normal', encryptNames: false }
    expect(batSections(o).map((s) => s.code.join('\r\n')).join('\r\n\r\n') + '\r\n').toBe(buildBat(o))
  })

  it('每个区块都有标题、解释和代码行', () => {
    const sections = batSections({ src: '', out: '', level: 'max', encryptNames: true })
    expect(sections.length).toBeGreaterThanOrEqual(6)
    for (const s of sections) {
      expect(s.title.length).toBeGreaterThan(0)
      expect(s.note.length).toBeGreaterThan(10)
      expect(s.code.length).toBeGreaterThan(0)
    }
  })
})
