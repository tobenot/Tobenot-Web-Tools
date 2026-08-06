#!/usr/bin/env node
/*
 * 校验 scripts/site-tools.mjs 是否与 src/data/routes.ts 同步。
 *
 * 存在原因：routes.ts 是工具单一事实源，但构建脚本（vite 预渲染 + gen-og）
 * 用的是手抄副本 site-tools.mjs。routes.ts 不能被 plain node 直接 import（带 React），
 * 于是两份清单靠手动同步。漏加一个工具时它仍能路由，只是静默拿到站点默认 OG ——
 * 没有任何构建期报错。这个脚本把该漂移提前到 CI。
 *
 * 判定：routes.ts 里「带 component 的工具」id 集合，必须与 site-tools.mjs 的 id 集合完全相等。
 * （external 外链与 changelog 等无 component 的导航入口不需要专属 OG，故排除。）
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { siteTools } from './site-tools.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const routesPath = path.resolve(__dirname, '..', 'src', 'data', 'routes.ts')
const src = fs.readFileSync(routesPath, 'utf8')

// 逐个工具对象：{ id: '...' ... }，非贪婪匹配到该对象的收尾 `}`（对象内无嵌套花括号）
const routeIds = new Set(
  [...src.matchAll(/\{\s*id:\s*'([^']+)'([\s\S]*?)\n\s*\}/g)]
    .filter((m) => /component:/.test(m[2]))
    .map((m) => m[1])
)

const siteIds = new Set(siteTools.map((t) => t.id))

const missing = [...routeIds].filter((id) => !siteIds.has(id)) // 有页面却没进 site-tools → 会退化成默认 OG
const stale = [...siteIds].filter((id) => !routeIds.has(id)) // site-tools 里有但 routes 里已无（拼错/删漏）

let failed = false
for (const id of missing) {
  console.error(`FAIL 工具 '${id}' 在 routes.ts 有页面，却漏进 site-tools.mjs —— 会静默退化成默认 OG`)
  failed = true
}
for (const id of stale) {
  console.error(`FAIL site-tools.mjs 里的 '${id}' 在 routes.ts 中不存在（拼错或已删）`)
  failed = true
}

if (routeIds.size === 0) {
  console.error('FAIL 没从 routes.ts 解析出任何带 component 的工具，正则可能已与文件结构脱节')
  failed = true
}

if (failed) {
  console.error('\n工具清单校验未通过：改完 routes.ts 后请同步 scripts/site-tools.mjs，并 `node scripts/gen-og.mjs` 补图')
  process.exit(1)
}
console.log(`工具清单校验通过（${routeIds.size} 个工具与 site-tools.mjs 一致）`)
