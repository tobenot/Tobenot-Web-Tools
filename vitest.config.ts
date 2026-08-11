import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // hash.ts / recent.ts 直接操作 window.location 与 localStorage
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    /*
     * React 18 在测试里直接调 state 时会触发 act(...) 告警；
     * 显式全局包裹，告警自动消失。
     */
    globalSetup: undefined,
  },
})
