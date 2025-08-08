#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const args = argv.slice(2)
  if (args.length === 0) return null
  const name = args[0]
  const opts = { title: name }
  for (let i = 1; i < args.length; i++) {
    const a = args[i]
    if (a === '--title' && args[i + 1]) {
      opts.title = args[i + 1]
      i++
    }
  }
  return { name, ...opts }
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function createIndexHtml(appDir, title) {
  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#f7f7f8" />
    <title>${title} | Mecha Tools</title>
    <link rel="stylesheet" href="/src/index.css" />
  </head>
  <body class="min-h-screen bg-mech-bg text-mech-text antialiased">
    <main class="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header class="sticky top-0 z-30 border-b border-mech-edge/70 backdrop-blur bg-mech-bg/70 -mx-4 px-4 py-3">
        <div class="flex items-center justify-between">
          <a class="font-semibold tracking-wider hover:text-black" href="/index.html">Mecha Tools</a>
          <a class="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-mech-edge bg-white hover:bg-neutral-50 text-mech-text transition-colors" href="/index.html#">返回首页</a>
        </div>
      </header>

      <section class="bg-mech-panel border border-mech-edge rounded-xl shadow-subtle p-6">
        <h1 class="text-xl font-semibold tracking-wide">${title}</h1>
        <p class="text-mech-muted mt-2">在 <code>apps/${path.basename(appDir)}</code> 目录中继续开发你的页面与脚本。</p>
      </section>
    </main>
  </body>
</html>\n`
  fs.writeFileSync(path.join(appDir, 'index.html'), html, 'utf-8')
}

async function main() {
  const args = parseArgs(process.argv)
  if (!args) {
    console.error('用法: npm run new:app <name> -- --title "页面标题"')
    process.exit(1)
  }
  const appDir = path.join(root, 'apps', args.name)
  if (fs.existsSync(appDir)) {
    console.error(`目录已存在: ${appDir}`)
    process.exit(1)
  }
  ensureDir(appDir)
  createIndexHtml(appDir, args.title)
  console.log(`已创建: apps/${args.name}/index.html`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})