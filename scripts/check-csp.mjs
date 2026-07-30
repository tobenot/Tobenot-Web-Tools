#!/usr/bin/env node
/*
 * 校验 index.html 的 CSP script-src 里的 sha256 哈希，是否与实际内联脚本匹配。
 *
 * 存在原因：CSP 用哈希放行内联脚本，一旦有人改动那段防 FOUC 的脚本却忘了更新哈希，
 * 脚本会被 CSP 静默拦下 —— 表现为暗色模式闪白、Service Worker 不注册，
 * 但控制台之外没有任何构建期报错。这个脚本把该失败提前到 CI。
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const htmlPath = path.resolve(__dirname, '..', 'index.html')
const html = fs.readFileSync(htmlPath, 'utf8')

const cspMatch = html.match(/http-equiv="Content-Security-Policy"[\s\S]*?content="([\s\S]*?)"/)
if (!cspMatch) {
  console.error('FAIL: index.html 中找不到 Content-Security-Policy meta 标签')
  process.exit(1)
}
const csp = cspMatch[1]

const declaredHashes = new Set([...csp.matchAll(/'sha256-([A-Za-z0-9+/=]+)'/g)].map((m) => m[1]))

// 只取没有 src 属性的 <script>，即内联脚本
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])

let failed = false

if (inlineScripts.length === 0) {
  if (declaredHashes.size > 0) {
    console.warn(`WARN: CSP 声明了 ${declaredHashes.size} 个哈希，但页面已无内联脚本，建议清理`)
  }
} else {
  for (const [i, code] of inlineScripts.entries()) {
    const hash = crypto.createHash('sha256').update(code, 'utf8').digest('base64')
    if (declaredHashes.has(hash)) {
      console.log(`OK   inline script #${i} -> sha256-${hash}`)
      declaredHashes.delete(hash)
    } else {
      console.error(`FAIL inline script #${i} 的哈希未在 CSP 中声明`)
      console.error(`     请把下面这个值加入 index.html 的 script-src：`)
      console.error(`     'sha256-${hash}'`)
      failed = true
    }
  }
}

for (const stale of declaredHashes) {
  console.warn(`WARN CSP 中的 sha256-${stale} 没有对应的内联脚本（可能已过期，建议移除）`)
}

// 顺手做几条策略健壮性检查，防止后续被随手放宽
const scriptSrc = (csp.match(/script-src([^;]*)/) || [, ''])[1]
if (scriptSrc.includes("'unsafe-inline'")) {
  console.error("FAIL script-src 含 'unsafe-inline'，内联事件处理器将可执行，XSS 防线失效")
  failed = true
}
if (scriptSrc.includes("'unsafe-eval'")) {
  console.error("FAIL script-src 含 'unsafe-eval'")
  failed = true
}
if (!/object-src\s+'none'/.test(csp)) {
  console.error("FAIL 缺少 object-src 'none'")
  failed = true
}
if (!/connect-src/.test(csp)) {
  console.error('FAIL 缺少 connect-src 白名单，凭证可被外发到任意域名')
  failed = true
}

if (failed) {
  console.error('\nCSP 校验未通过')
  process.exit(1)
}
console.log('\nCSP 校验通过')
