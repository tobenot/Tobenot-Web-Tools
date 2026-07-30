import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * 自动发现 apps/<slug>/index.html 作为多页入口。
 *
 * 同时校验 meta.json 是否存在：缺失时该应用虽会被正常构建，
 * 但 src/data/apps.ts 的 import.meta.glob 扫不到它，
 * 于是首页卡片与 Ctrl+K 搜索里都不会出现——只能靠手输路径访问。
 * 这类遗漏此前完全静默（outline-reorder 就是如此），故在构建期显式告警。
 * 有意隐藏的应用请在 meta.json 里写 "hidden": true（见 apps/hello）。
 */
function discoverHtmlEntries() {
  const appsDir = path.resolve(__dirname, 'apps')
  const inputs: Record<string, string> = {}
  const missingMeta: string[] = []

  if (fs.existsSync(appsDir)) {
    for (const name of fs.readdirSync(appsDir)) {
      const htmlPath = path.join(appsDir, name, 'index.html')
      if (fs.existsSync(htmlPath)) {
        inputs[name] = htmlPath
        if (!fs.existsSync(path.join(appsDir, name, 'meta.json'))) {
          missingMeta.push(name)
        }
      }
    }
  }

  if (missingMeta.length > 0) {
    console.warn(
      `\n[apps] 以下应用缺少 meta.json，将不会出现在首页与 Ctrl+K 搜索中：\n` +
        missingMeta.map((n) => `  - apps/${n}/`).join('\n') +
        `\n  如为有意隐藏，请创建 meta.json 并设置 "hidden": true\n`,
    )
  }

  // Always include root index.html as the main entry
  inputs.main = path.resolve(__dirname, 'index.html')
  return inputs
}

/**
 * 构建期把 sw.js 里的 __BUILD_ID__ 替换成真实版本号。
 *
 * 没有这一步，CACHE_NAME 永远不变，SW 的旧缓存清理分支就成了死代码，
 * 用户会一直拿到上一版的 index.html。
 * 优先用 git short SHA，取不到时退化为时间戳。
 */
function swVersionPlugin(): Plugin {
  let buildId = ''
  return {
    name: 'sw-version',
    apply: 'build',
    buildStart() {
      try {
        buildId = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
          .toString()
          .trim()
      } catch {
        buildId = ''
      }
      if (!buildId) buildId = String(Date.now())
    },
    generateBundle(_options, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type === 'asset' && asset.fileName === 'sw.js') {
          asset.source = String(asset.source).replace(/__BUILD_ID__/g, buildId)
        }
      }
    },
    closeBundle() {
      // public/ 下的文件由 Vite 直接拷贝，不进 bundle，需要落盘后再替换
      const swPath = path.resolve(__dirname, 'dist', 'sw.js')
      if (fs.existsSync(swPath)) {
        const src = fs.readFileSync(swPath, 'utf8')
        if (src.includes('__BUILD_ID__')) {
          fs.writeFileSync(swPath, src.replace(/__BUILD_ID__/g, buildId))
        }
      }
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), swVersionPlugin()],
  build: {
    rollupOptions: {
      input: discoverHtmlEntries(),
    },
  },
})
