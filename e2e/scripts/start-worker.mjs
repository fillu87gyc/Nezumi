// E2E 用に Workers を起動するスクリプト（playwright.config.ts の webServer から呼ばれる）。
//
// - D1 / KV の状態は e2e/.wrangler-state に隔離し、起動ごとにまっさらにする
// - D1 マイグレーションを適用してから wrangler dev --local を起動する
//   （DB は miniflare が動かす本物の D1（SQLite）。モックではない）
// - 外部 API のベース URL を --var でモックサーバーへ向ける

import { spawnSync, spawn } from 'node:child_process'
import { rmSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const STATE_DIR = join(ROOT, 'e2e', '.wrangler-state')
const WRANGLER = join(ROOT, 'node_modules', '.bin', 'wrangler')
const MOCK_BASE = 'http://127.0.0.1:9377'

export const E2E_VARS = {
  ENVIRONMENT: 'development',
  BASE_URL: 'http://127.0.0.1:8787',
  JWT_SECRET: 'e2e-test-jwt-secret-0123456789abcdef',
  REDDIT_CLIENT_ID: 'e2e-client-id',
  REDDIT_CLIENT_SECRET: 'e2e-client-secret',
  DEEPL_API_KEY: 'e2e-deepl-key',
  CLAUDE_API_KEY: 'e2e-claude-key',
  REDDIT_WWW_BASE: MOCK_BASE,
  REDDIT_OAUTH_BASE: MOCK_BASE,
  DEEPL_API_BASE: MOCK_BASE,
  CLAUDE_API_BASE: MOCK_BASE,
}

if (!existsSync(join(ROOT, 'client', 'dist', 'index.html'))) {
  console.error('[e2e] client/dist がありません。先に `pnpm build` を実行してください。')
  process.exit(1)
}

rmSync(STATE_DIR, { recursive: true, force: true })

const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' }

console.log('[e2e] applying D1 migrations...')
const mig = spawnSync(
  WRANGLER,
  ['d1', 'migrations', 'apply', 'nezumi-db', '--local', '--persist-to', STATE_DIR],
  { cwd: ROOT, env, stdio: 'inherit' }
)
if (mig.status !== 0) process.exit(mig.status ?? 1)

const varArgs = Object.entries(E2E_VARS).flatMap(([k, v]) => ['--var', `${k}:${v}`])

console.log('[e2e] starting wrangler dev --local ...')
const dev = spawn(
  WRANGLER,
  // --test-scheduled: GET /__scheduled で Cron Trigger（push 通知ポーリング）を発火できるようにする
  ['dev', '--local', '--ip', '127.0.0.1', '--port', '8787', '--persist-to', STATE_DIR, '--test-scheduled', ...varArgs],
  { cwd: ROOT, env, stdio: 'inherit' }
)
dev.on('exit', (code) => process.exit(code ?? 0))
process.on('SIGTERM', () => dev.kill('SIGTERM'))
process.on('SIGINT', () => dev.kill('SIGINT'))
