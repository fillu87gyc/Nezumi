import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

// wrangler dev と同じ persist ディレクトリの D1（SQLite）に対して SQL を実行する。
// dev サーバー稼働中の別プロセスアクセスになるため、ロック競合時はリトライする。

const ROOT = join(__dirname, '..', '..')
const STATE_DIR = join(ROOT, 'e2e', '.wrangler-state')
const WRANGLER = join(ROOT, 'node_modules', '.bin', 'wrangler')

export function d1Execute(sql: string): string {
  let lastError: unknown
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return execFileSync(
        WRANGLER,
        ['d1', 'execute', 'nezumi-db', '--local', '--persist-to', STATE_DIR, '--command', sql],
        { cwd: ROOT, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }, encoding: 'utf8' }
      )
    } catch (err) {
      lastError = err
      // SQLite ロック等の一時的失敗を待って再試行
      execFileSync('sleep', [String(1 + attempt)])
    }
  }
  throw lastError
}
