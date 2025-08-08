import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function discoverHtmlEntries() {
  const appsDir = path.resolve(__dirname, 'apps')
  const inputs: Record<string, string> = {}
  if (fs.existsSync(appsDir)) {
    for (const name of fs.readdirSync(appsDir)) {
      const htmlPath = path.join(appsDir, name, 'index.html')
      if (fs.existsSync(htmlPath)) {
        inputs[name] = htmlPath
      }
    }
  }
  // Always include root index.html as the main entry
  inputs.main = path.resolve(__dirname, 'index.html')
  return inputs
}

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: discoverHtmlEntries(),
    },
  },
})