import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // E2E（e2e/**/*.spec.ts は Playwright 管轄）を拾わないよう unit test を src に限定する
    include: ['src/**/*.test.ts'],
  },
})
