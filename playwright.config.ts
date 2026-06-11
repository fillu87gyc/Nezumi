import { defineConfig } from '@playwright/test'

// E2E 構成:
//   mock server (127.0.0.1:9377) … Reddit / DeepL / Claude のフェイク（e2e/mock/server.mjs）
//   wrangler dev (127.0.0.1:8787) … 本物の Workers + KV + D1(SQLite) + ビルド済みクライアント
//
// 状態を共有する（KV キャッシュ・D1・モックのカウンター）ため直列実行する。
// 実行時間よりも決定性とカバレッジを優先する方針。
export default defineConfig({
  testDir: './e2e/tests',
  outputDir: './e2e/test-results',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: './e2e/helpers/global-setup.ts',
  globalTeardown: './e2e/helpers/build-gallery.ts',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e/playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:8787',
    permissions: ['notifications'],
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
      use: { storageState: 'e2e/.auth/alice.json' },
    },
  ],
  webServer: [
    {
      command: 'node e2e/mock/server.mjs',
      url: 'http://127.0.0.1:9377/__mock/health',
      // 前回実行の KV / D1 / モック統計を持ち越さないため、常に新規起動する
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'node e2e/scripts/start-worker.mjs',
      url: 'http://127.0.0.1:8787/manifest.webmanifest',
      // 前回実行の KV / D1 / モック統計を持ち越さないため、常に新規起動する
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
