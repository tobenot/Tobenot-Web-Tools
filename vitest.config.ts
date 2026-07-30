import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // hash.ts / recent.ts 直接操作 window.location 与 localStorage
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
