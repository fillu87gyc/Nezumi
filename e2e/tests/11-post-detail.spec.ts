import { test, expect } from '@playwright/test'
import { capture } from '../helpers/report'

// 投稿詳細画面（#24）— FeedCard クリック → PostDetail → コメント表示 → 戻る

async function gotoFeed(page: Parameters<typeof capture>[0]) {
  await page.goto('/')
  await expect(page.locator('.feed-card').first()).toBeVisible({ timeout: 20_000 })
}

test('FeedCard をクリックすると投稿詳細画面に遷移する', async ({ page }) => {
  await gotoFeed(page)

  // 最初のカード（textpost1）をクリック
  await page.locator('.feed-card').first().click()

  // PostDetail が表示される
  await expect(page.locator('.post-detail')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('.back-btn')).toBeVisible()

  await capture(page, {
    id: '14-post-detail',
    tickets: [24],
    title: '投稿詳細画面',
    desc: 'FeedCard クリックで PostDetail に遷移し、タイトル・本文・コメントを表示する。',
  })
})

test('投稿詳細画面にタイトルとコメントが表示される', async ({ page }) => {
  await gotoFeed(page)
  await page.locator('.feed-card').first().click()

  await expect(page.locator('.post-detail')).toBeVisible()

  // post の title が表示される（翻訳ありの場合 TextSwipe、なしの場合 h1）
  const titleSelector = page.locator('.post-detail-title')
  await expect(titleSelector).toBeVisible()

  // コメントセクションが表示される
  await expect(page.locator('.comments-section')).toBeVisible()
  await expect(page.locator('.comments-title')).toBeVisible()

  // textpost1 には 2 件のコメントがある（fixtures.mjs の COMMENTS.textpost1）
  await expect(page.locator('.comment')).toHaveCount(3, { timeout: 15_000 }) // c1, c1r1(nested), c2

  await capture(page, {
    id: '15-post-detail-comments',
    tickets: [24],
    title: '投稿詳細 — コメントツリー',
    desc: 'コメントが深さ付きでネスト表示される。kind=more は除外される。',
    fullPage: true,
  })
})

test('コメントにネスト（返信）が表示される', async ({ page }) => {
  await gotoFeed(page)
  await page.locator('.feed-card').first().click()
  await expect(page.locator('.comments-section')).toBeVisible()

  // depth=0 のコメントが 2 件（c1, c2）
  await expect(page.locator('.comment[data-depth="0"]')).toHaveCount(2, { timeout: 15_000 })

  // depth=1 の返信が 1 件（c1r1）
  await expect(page.locator('.comment[data-depth="1"]')).toHaveCount(1)

  // c1 には返信がある
  const c1 = page.locator('.comment[data-depth="0"]').first()
  await expect(c1).toContainText('linguist')
  await expect(c1.locator('.comment[data-depth="1"]')).toContainText('wordnerd')
})

test('「戻る」ボタンでフィードに戻る', async ({ page }) => {
  await gotoFeed(page)
  await page.locator('.feed-card').first().click()
  await expect(page.locator('.post-detail')).toBeVisible()

  await page.locator('.back-btn').click()

  // フィードに戻る
  await expect(page.locator('.feed-card').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('.post-detail')).toHaveCount(0)

  await capture(page, {
    id: '16-post-detail-back',
    tickets: [24],
    title: '投稿詳細 — 戻るボタン',
    desc: '「戻る」ボタンでフィード一覧に戻る。',
  })
})

test('コメント数バッジクリックでも投稿詳細に遷移する', async ({ page }) => {
  await gotoFeed(page)

  const firstCard = page.locator('.feed-card').first()
  await firstCard.locator('.comments-btn').click()

  await expect(page.locator('.post-detail')).toBeVisible({ timeout: 10_000 })
})

test('ナビゲーションの「フィード」ボタンで戻ることもできる', async ({ page }) => {
  await gotoFeed(page)
  await page.locator('.feed-card').first().click()
  await expect(page.locator('.post-detail')).toBeVisible()

  await page.locator('.nav-item', { hasText: 'フィード' }).click()

  await expect(page.locator('.feed-card').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('.post-detail')).toHaveCount(0)
})
