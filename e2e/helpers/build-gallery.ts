import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ARTIFACTS_DIR } from './report'

interface Entry {
  id: string
  tickets: number[]
  title: string
  desc: string
  type: 'screenshot' | 'api'
  file: string
}

// manifest.jsonl から機能カタログ（index.html / FEATURES.md）を生成する。
// GitHub Actions はこの artifacts ディレクトリを丸ごとアーティファクトとして残す。
export default function buildGallery(): void {
  const manifestPath = join(ARTIFACTS_DIR, 'manifest.jsonl')
  if (!existsSync(manifestPath)) return

  const entries: Entry[] = readFileSync(manifestPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l))
  // 同一 ID はリトライ等の最後の記録を採用し、ID 順に並べる
  const byId = new Map<string, Entry>()
  for (const e of entries) byId.set(e.id, e)
  const sorted = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))

  const ticketLinks = (tickets: number[]) =>
    tickets.map((t) => `#${t}`).join(', ')

  // --- FEATURES.md ---
  const md: string[] = [
    '# Nezumi 機能カタログ（E2E 実行結果）',
    '',
    `生成日時: ${new Date().toISOString()}`,
    '',
    '各機能の E2E 実行時のスクリーンショット / API 証跡。チケット番号は docs/ticket/ に対応。',
    '',
  ]
  for (const e of sorted) {
    md.push(`## ${e.title}`)
    md.push('')
    md.push(`- チケット: ${ticketLinks(e.tickets)}`)
    md.push(`- ${e.desc}`)
    md.push('')
    if (e.type === 'screenshot') {
      md.push(`![${e.title}](${e.file})`)
    } else {
      md.push(`API 証跡: [\`${e.file}\`](${e.file})`)
    }
    md.push('')
  }
  writeFileSync(join(ARTIFACTS_DIR, 'FEATURES.md'), md.join('\n'))

  // --- index.html ---
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const cards = sorted
    .map((e) => {
      const body =
        e.type === 'screenshot'
          ? `<a href="${e.file}"><img src="${e.file}" alt="${esc(e.title)}" loading="lazy"></a>`
          : `<details><summary>API レスポンス証跡</summary><pre>${esc(
              readFileSync(join(ARTIFACTS_DIR, e.file), 'utf8')
            )}</pre></details>`
      return `<section class="card">
  <h2>${esc(e.title)} <span class="tickets">${ticketLinks(e.tickets)}</span></h2>
  <p>${esc(e.desc)}</p>
  ${body}
</section>`
    })
    .join('\n')

  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>Nezumi 機能カタログ — E2E 実行結果</title>
<style>
  body { font-family: -apple-system, "Hiragino Sans", sans-serif; background: #0d0d0f; color: #eee; margin: 0; padding: 2rem; }
  h1 { color: #ff4500; }
  .meta { color: #888; margin-bottom: 2rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 1.5rem; }
  .card { background: #1a1a1e; border-radius: 12px; padding: 1rem 1.25rem; }
  .card h2 { font-size: 1.05rem; margin: 0 0 .25rem; }
  .card .tickets { color: #ff4500; font-size: .8rem; font-weight: normal; margin-left: .5rem; }
  .card p { color: #aaa; font-size: .85rem; margin: 0 0 .75rem; }
  .card img { width: 100%; border-radius: 8px; border: 1px solid #333; }
  pre { background: #111; padding: .75rem; border-radius: 8px; overflow: auto; font-size: .75rem; max-height: 320px; }
  summary { cursor: pointer; color: #ff8c42; }
</style>
</head>
<body>
<h1>🐭 Nezumi 機能カタログ</h1>
<p class="meta">E2E テスト実行時に自動取得（${new Date().toISOString()}）。全機能の動作証跡。</p>
<div class="grid">
${cards}
</div>
</body>
</html>`
  writeFileSync(join(ARTIFACTS_DIR, 'index.html'), html)

  console.log(`[e2e] feature gallery: ${join(ARTIFACTS_DIR, 'index.html')} (${sorted.length} entries)`)
}
