import { test, expect } from '@playwright/test'
import { capture, recordApi } from '../helpers/report'

// PWA（#13/#15）: manifest 配信・Service Worker 登録・オフライン表示

test('Web App Manifest が配信され、必須フィールドを持つ', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest')
  expect(res.ok()).toBe(true)
  const manifest = await res.json()
  expect(manifest.name).toBe('Nezumi — Reddit JP')
  expect(manifest.display).toBe('standalone')
  expect(manifest.theme_color).toBe('#ff4500')
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3)
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)

  recordApi({
    id: '14-pwa-manifest',
    tickets: [13],
    title: 'PWA — Web App Manifest',
    desc: 'manifest.webmanifest が配信され、ホーム画面追加に必要なアイコン（maskable 含む）とメタ情報を持つ。',
    evidence: manifest,
  })
})

test('Service Worker が登録され、push / notificationclick ハンドラを含む', async ({ page, request }) => {
  await page.goto('/')
  const swInfo = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready
    return { scope: reg.scope, hasActive: !!reg.active }
  })
  expect(swInfo.hasActive).toBe(true)

  // ビルドされた sw.js に push 受信・通知クリック処理が含まれている（#15）
  // （generateSW 構成だと src/sw.ts が捨てられるリグレッションをここで検知する）
  const sw = await (await request.get('/sw.js')).text()
  expect(sw).toContain('push')
  expect(sw).toContain('notificationclick')
  expect(sw).toContain('showNotification')

  recordApi({
    id: '15-service-worker',
    tickets: [13, 15],
    title: 'PWA — Service Worker 登録',
    desc: 'sw.js が precache + ランタイムキャッシュ + push/notificationclick ハンドラ込みでビルド・登録される。',
    evidence: swInfo,
  })
})

test('オフラインでもアプリシェルとキャッシュ済みフィードが表示される', async ({ page, context }) => {
  // 1 回目: SW インストール
  await page.goto('/')
  await expect(page.locator('.feed-card').first()).toBeVisible({ timeout: 20_000 })
  await page.evaluate(() => navigator.serviceWorker.ready)

  // 2 回目: SW 制御下でフィードを取得し、NetworkFirst のランタイムキャッシュに載せる
  await page.reload()
  await expect(page.locator('.feed-card').first()).toBeVisible({ timeout: 20_000 })

  // オフラインにしてリロード → precache のシェル + キャッシュ済みフィード
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('.nav-brand')).toHaveText('Nezumi', { timeout: 20_000 })
  await expect(page.locator('.feed-card').first()).toBeVisible({ timeout: 20_000 })

  await capture(page, {
    id: '16-offline',
    tickets: [13],
    title: 'PWA — オフライン表示',
    desc: 'オフライン時も precache されたアプリシェルと NetworkFirst キャッシュ済みフィードを表示できる。',
    fullPage: true,
  })

  await context.setOffline(false)
})
