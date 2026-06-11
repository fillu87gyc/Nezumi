import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from '@playwright/test'

// 機能カタログ用のアーティファクト収集。
// 各テストが capture() / recordApi() で証跡を残し、globalTeardown が
// e2e/artifacts/index.html と FEATURES.md のギャラリーに組み立てる。

export const ARTIFACTS_DIR = join(__dirname, '..', 'artifacts')
const SCREENSHOTS_DIR = join(ARTIFACTS_DIR, 'screenshots')
const API_DIR = join(ARTIFACTS_DIR, 'api')
const MANIFEST = join(ARTIFACTS_DIR, 'manifest.jsonl')

export interface FeatureEntry {
  /** ギャラリー上の並び順を兼ねる ID（例: '03-feed-home'） */
  id: string
  /** 関連チケット番号 */
  tickets: number[]
  title: string
  desc: string
}

function append(entry: FeatureEntry & { type: string; file: string }) {
  mkdirSync(ARTIFACTS_DIR, { recursive: true })
  appendFileSync(MANIFEST, JSON.stringify(entry) + '\n')
}

export async function capture(
  page: Page,
  entry: FeatureEntry & { fullPage?: boolean }
): Promise<void> {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  const file = `screenshots/${entry.id}.png`
  await page.screenshot({ path: join(ARTIFACTS_DIR, file), fullPage: entry.fullPage ?? false })
  append({ ...entry, type: 'screenshot', file })
}

export function recordApi(entry: FeatureEntry & { evidence: unknown }): void {
  mkdirSync(API_DIR, { recursive: true })
  const file = `api/${entry.id}.json`
  writeFileSync(join(ARTIFACTS_DIR, file), JSON.stringify(entry.evidence, null, 2))
  append({ id: entry.id, tickets: entry.tickets, title: entry.title, desc: entry.desc, type: 'api', file })
}
