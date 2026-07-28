/** ponytail: one-shot roundtrip check for md-reader ?c= encoding */
import https from 'node:https'

const src = 'https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js'
const js = await new Promise((resolve, reject) => {
  https.get(src, (res) => {
    let d = ''
    res.on('data', (c) => { d += c })
    res.on('end', () => resolve(d))
  }).on('error', reject)
})
;(0, eval)(js)

const md = `# 标题\n\n几千字测试：${'法器术法神魂'.repeat(200)}`
const c = globalThis.LZString.compressToEncodedURIComponent(md)
const back = globalThis.LZString.decompressFromEncodedURIComponent(c)
const spaced = globalThis.LZString.decompressFromEncodedURIComponent(c.replace(/\+/g, ' '))
if (back !== md || spaced !== md) {
  console.error('FAIL roundtrip')
  process.exit(1)
}
console.log('ok', { len: c.length, sample: `https://tools.tobenot.top/#markdown-reader?c=${c.slice(0, 24)}…&style=business` })
