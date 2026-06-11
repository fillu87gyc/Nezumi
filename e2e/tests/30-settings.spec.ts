import { test, expect, type Page } from '@playwright/test'
import { capture } from '../helpers/report'

// 設定画面 UI（#18）+ 自動翻訳トグルのフィード連動（#9）+ ログアウト（#3）

async function gotoSettings(page: Page) {
  await page.goto('/')
  await page.locator('.nav-item', { hasText: '設定' }).click()
  await expect(page.locator('.settings-title')).toHaveText('設定')
}

test('設定画面に翻訳・フィルター・NGワード・通知・アカウントの各セクションが表示される', async ({ page }) => {
  await gotoSettings(page)

  for (const section of ['翻訳', 'フィルター', 'NGワード', '通知', 'アカウント']) {
    await expect(page.locator('.section-title', { hasText: section })).toBeVisible()
  }

  await capture(page, {
    id: '09-settings',
    tickets: [18],
    title: '設定画面',
    desc: '翻訳トグル・NSFW/スコア/コメント数フィルター・NGワード管理・プッシュ通知・ログアウトを 1 画面で提供する。',
    fullPage: true,
  })
})

test('自動翻訳をオフにするとフィードが原文（translate=false）で表示される', async ({ page }) => {
  await gotoSettings(page)

  // 「自動翻訳」トグルをオフ
  const row = page.locator('.toggle-row', { hasText: '自動翻訳' })
  await expect(row.locator('input')).toBeChecked()
  await row.locator('input').uncheck()

  // フィードへ戻ると titleJa なし → TextSwipe ではなく素の h2 表示
  await page.locator('.nav-item', { hasText: 'フィード' }).click()
  await expect(page.locator('.feed-card').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.card-title h2').first()).toContainText(
    'TIL the Japanese word for mouse is "nezumi"'
  )
  await expect(page.locator('.card-title .text-swipe')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('【JA】')

  await capture(page, {
    id: '10-translate-off',
    tickets: [9, 18],
    title: '自動翻訳オフ（原文フィード）',
    desc: '設定で自動翻訳を切ると ?translate=false でフィードを取得し、翻訳なしの原文タイトルが表示される。',
    fullPage: true,
  })
})

test('NGワードの追加・削除がリアルタイムに反映され、リロード後も保持される', async ({ page }) => {
  await gotoSettings(page)

  // 追加（Enter キー対応）
  await page.locator('.ng-input').fill('tanuki')
  await page.locator('.ng-input').press('Enter')
  await expect(page.locator('.ng-tag', { hasText: 'tanuki' })).toBeVisible()

  await page.locator('.ng-input').fill('kitsune')
  await page.locator('.ng-add-btn').click()
  // D1 には setup でシードされた FILTERME が既にある (合計 3 件)
  await expect(page.locator('.ng-tag')).toHaveCount(3)

  await capture(page, {
    id: '11-ngword-tags',
    tickets: [18, 23],
    title: 'NGワード管理',
    desc: 'NGワードをテキスト入力 + Enter / 追加ボタンで登録でき、タグとして一覧表示される。D1 に永続化される。',
  })

  // リロードしても保持される（D1 API 経由）
  await page.reload()
  await page.locator('.nav-item', { hasText: '設定' }).click()
  await expect(page.locator('.ng-tag', { hasText: 'tanuki' })).toBeVisible()
  await expect(page.locator('.ng-tag', { hasText: 'kitsune' })).toBeVisible()

  // 削除
  await page.locator('.ng-tag', { hasText: 'tanuki' }).locator('.ng-remove').click()
  await expect(page.locator('.ng-tag', { hasText: 'tanuki' })).toHaveCount(0)
  await expect(page.locator('.ng-tag', { hasText: 'kitsune' })).toHaveCount(1)
})

test('フィルタースライダー（最低スコア・最低コメント数）が操作に追従する', async ({ page }) => {
  await gotoSettings(page)

  const scoreRow = page.locator('.slider-row', { hasText: '最低スコア' })
  await scoreRow.locator('input[type=range]').fill('500')
  await expect(scoreRow).toContainText('最低スコア: 500')

  const commentsRow = page.locator('.slider-row', { hasText: '最低コメント数' })
  await commentsRow.locator('input[type=range]').fill('42')
  await expect(commentsRow).toContainText('最低コメント数: 42')

  // リロード後も保持
  await page.reload()
  await page.locator('.nav-item', { hasText: '設定' }).click()
  await expect(page.locator('.slider-row', { hasText: '最低スコア' })).toContainText('最低スコア: 500')
})

test('プッシュ通知トグルを操作してもクラッシュしない', async ({ page }) => {
  await gotoSettings(page)

  const row = page.locator('.toggle-row', { hasText: 'プッシュ通知' })
  await row.locator('input').click()
  // headless ではブラウザのプッシュサービスに到達できないため、購読の成否は環境依存。
  // ここでは「画面がクラッシュせず操作可能なまま」であることを保証する（#15 AC-5 相当）
  await expect(page.locator('.settings-title')).toHaveText('設定')

  await capture(page, {
    id: '12-push-toggle',
    tickets: [14, 15, 18],
    title: 'プッシュ通知設定',
    desc: '通知トグルから Push 購読フローを起動する。購読失敗時も UI はクラッシュしない。',
  })
})

test('ログアウトするとログイン画面に戻り Cookie が削除される', async ({ page, context }) => {
  await gotoSettings(page)

  await page.locator('.logout-btn').click()
  await expect(page.locator('.login-card h1')).toHaveText('Nezumi', { timeout: 20_000 })

  const cookies = await context.cookies('http://127.0.0.1:8787')
  expect(cookies.find((c) => c.name === 'session')).toBeUndefined()
  expect(cookies.find((c) => c.name === 'logged_in')).toBeUndefined()

  await capture(page, {
    id: '13-logout',
    tickets: [3, 18],
    title: 'ログアウト',
    desc: 'ログアウトで session / logged_in Cookie が削除され、ログイン画面に戻る。',
  })
})
