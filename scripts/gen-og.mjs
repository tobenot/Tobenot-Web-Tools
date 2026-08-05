// 一次性本地生成每个工具的 OG 图（1200x630），提交 PNG 进仓库，CI 不渲染。
// 仿 public/og.png：深藏青底 + 白色 M 标 + 工具标题 + 品牌副标题。清爽风。
// 用法：node scripts/gen-og.mjs
import { Resvg } from '@resvg/resvg-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { siteTools } from './site-tools.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'public', 'og')
fs.mkdirSync(outDir, { recursive: true })

const FONTS = [
  'C:/Windows/Fonts/arialbd.ttf',
  'C:/Windows/Fonts/msyhbd.ttc',
].filter((f) => fs.existsSync(f))

const W = 1200
const H = 630
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 粗略字宽估算，用于自适应字号避免标题溢出（CJK≈1em，拉丁≈0.56em）
function approxWidth(text, size) {
  let em = 0
  for (const ch of text) em += ch.charCodeAt(0) < 256 ? 0.56 : 1
  return em * size
}

function svg(title) {
  const textX = 430
  const maxW = W - textX - 80
  let titleSize = 88
  while (approxWidth(title, titleSize) > maxW && titleSize > 48) titleSize -= 2
  const subtitle = 'Mecha Tools · 现代机械风 Web 工具站'
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="28%" cy="34%" r="75%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#0f172a"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <text x="120" y="410" font-family="Arial" font-weight="700" font-size="300" fill="#ffffff">M</text>
  <text x="${textX}" y="300" font-family="Arial, 'Microsoft YaHei'" font-weight="700" font-size="${titleSize}" fill="#f8fafc">${esc(title)}</text>
  <text x="${textX}" y="372" font-family="Arial, 'Microsoft YaHei'" font-weight="700" font-size="34" fill="#94a3b8">${esc(subtitle)}</text>
</svg>`
}

let n = 0
for (const { id, title } of siteTools) {
  const r = new Resvg(svg(title), {
    font: { fontFiles: FONTS, loadSystemFonts: true, defaultFontFamily: 'Arial' },
    fitTo: { mode: 'width', value: W },
  })
  fs.writeFileSync(path.join(outDir, `${id}.png`), r.render().asPng())
  n++
}
console.log(`generated ${n} OG images -> public/og/`)
