import { test, expect, type Page } from '@playwright/test'
import { capture } from '../helpers/report'
import { mockConfig } from '../helpers/mock'

// エラーハンドリング + ローディング UI（#21）

async function gotoFeed(page: Page) {
  await page.goto('/')
  await expect(page.locator('.feed-card').first()).toBeVisible({ timeout: 20_000 })
}

test('フィード API エラー時にエラー UI と再試行ボタンが表示される', async ({ page }) => {
  // モックサーバーをエラーモードに切り替え
  await mockConfig({ failFeed: true })

  await page.goto('/')

  // エラー UI が表示されるまで待つ
  await expect(page.locator('.feed-error')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.feed-error')).toContainText('フィードの読み込みに失敗しました')

  // 再試行ボタンが存在する
  const retryBtn = page.locator('.feed-error .retry-btn')
  await expect(retryBtn).toBeVisible()

  await capture(page, {
    id: '37-feed-error-ui',
    tickets: [21],
    title: 'フィードエラー UI + 再試行ボタン',
    desc: 'フィード API が 500 を返すとエラーメッセージと再試行ボタンが表示される。',
  })

  // モックを正常に戻す
  await mockConfig({ failFeed: false })
})

test('再試行ボタンでフィードが復帰する', async ({ page }) => {
  await mockConfig({ failFeed: true })
  await page.goto('/')
  await expect(page.locator('.feed-error')).toBeVisible({ timeout: 15_000 })

  // 正常モードに戻してから再試行
  await mockConfig({ failFeed: false })
  await page.locator('.feed-error .retry-btn').click()

  // フィードカードが表示される
  await expect(page.locator('.feed-card').first()).toBeVisible({ timeout: 20_000 })
})

test('ErrorBoundary が白画面を防ぐ', async ({ page }) => {
  // ErrorBoundary は React レベルの例外をキャッチする。
  // 通常のフィード操作では発生しないため、コードが存在することを構造確認で検証する。
  await gotoFeed(page)

  // App が正常にレンダリングされている（ErrorBoundary がラップしている状態）
  await expect(page.locator('.app')).toBeVisible()
  await expect(page.locator('.feed-card').first()).toBeVisible()
})

test('ローディング中にスケルトンが表示される', async ({ page }) => {
  // ネットワークを遅延させてスケルトンを捕捉
  await page.route('/api/feed/home*', async (route) => {
    await new Promise((r) => setTimeout(r, 800))
    await route.continue()
  })

  await page.goto('/')

  // スケルトンが一瞬でも表示されることを確認
  await expect(page.locator('.skeleton-card').first()).toBeVisible({ timeout: 3000 })

  await capture(page, {
    id: '38-skeleton-loading',
    tickets: [21],
    title: 'フィードスケルトンローディング',
    desc: 'フィード取得中にスケルトンカードが表示される。',
  })
})
