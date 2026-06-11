import { test, expect, type Page } from '@playwright/test'
import { capture } from '../helpers/report'

// ホームフィード UI（#5/#7/#9/#10/#16/#17）
// モックの 1 ページ目は 7 投稿。alice には D1 シード済みフィルター
// （NG ワード FILTERME / minScore 5 / NSFW 非表示）が効き、4 投稿だけが表示される。

async function gotoFeed(page: Page) {
  await page.goto('/')
  await expect(page.locator('.feed-card').first()).toBeVisible({ timeout: 20_000 })
}

test('ホームフィードが日本語翻訳付きで表示され、D1 のフィルターが適用される', async ({ page }) => {
  await gotoFeed(page)

  // D1 フィルター適用後の 4 件（7 - NGワード - 低スコア - NSFW）
  await expect(page.locator('.feed-card')).toHaveCount(4)
  await expect(page.locator('body')).not.toContainText('FILTERME')
  await expect(page.locator('body')).not.toContainText('A very low effort post')
  await expect(page.locator('.badge.nsfw')).toHaveCount(0)

  // 翻訳済みタイトル（DeepL モックは 【JA】 プレフィックスを付ける）と日本語ラベル
  const firstCard = page.locator('.feed-card').first()
  await expect(firstCard.locator('.card-title')).toContainText('【JA】TIL the Japanese word')
  await expect(firstCard.locator('.lang-label').first()).toHaveText('🇯🇵 日本語')

  // メタ情報・フレア・スコア表示
  await expect(firstCard.locator('.subreddit')).toHaveText('r/todayilearned')
  await expect(firstCard.locator('.author')).toHaveText('u/wordnerd')
  await expect(firstCard.locator('.badge.flair')).toHaveText('Language')
  await expect(firstCard.locator('.score')).toContainText('4,821')

  await capture(page, {
    id: '03-feed-home',
    tickets: [5, 7, 9, 16, 17],
    title: 'ホームフィード（自動翻訳 + サーバーサイドフィルター）',
    desc: 'タイトルが日本語翻訳付きで表示される。D1 の NG ワード・最低スコア・NSFW フィルターがサーバーサイドで適用され、7 投稿中 4 投稿だけが届く。',
    fullPage: true,
  })
})

test('タイトルを左右スワイプすると原文 ↔ 翻訳が切り替わる', async ({ page }) => {
  await gotoFeed(page)

  const title = page.locator('.feed-card').first().locator('.card-title .text-swipe')
  // 初期状態: 日本語パネル + 1 つ目のドットがアクティブ
  await expect(title.locator('.dot').first()).toHaveClass(/active/)

  // 原文パネルへスワイプ（scroll-snap なので scrollLeft を直接動かす）
  await title.locator('.text-swipe-track').evaluate((el) => {
    el.scrollTo({ left: el.clientWidth, behavior: 'instant' as ScrollBehavior })
  })
  await expect(title.locator('.text-swipe-panel.original .lang-label')).toHaveText('🇺🇸 Original')
  await expect(title.locator('.dot').nth(1)).toHaveClass(/active/)
  await expect(title).toContainText('TIL the Japanese word for mouse is "nezumi"')

  await capture(page, {
    id: '04-text-swipe-original',
    tickets: [10],
    title: 'TextSwipe — 原文表示への切り替え',
    desc: 'タイトルをスワイプすると 🇯🇵 日本語 ↔ 🇺🇸 Original が切り替わり、ドットインジケーターが連動する。',
  })
})

test('selftext のある投稿は本文も TextSwipe で翻訳表示される', async ({ page }) => {
  await gotoFeed(page)

  const body = page.locator('.feed-card').first().locator('.card-body .text-swipe')
  await expect(body).toContainText('【JA】I learned this while studying Japanese')
})

test('無限スクロールで 2 ページ目が自動読み込みされる', async ({ page }) => {
  await gotoFeed(page)
  await expect(page.locator('.feed-card')).toHaveCount(4)

  // sentinel が見えると次ページを取得する
  await page.locator('.sentinel').scrollIntoViewIfNeeded()
  await expect(page.locator('.feed-card')).toHaveCount(6, { timeout: 20_000 })
  await expect(page.locator('body')).toContainText('Second page marker post')

  await capture(page, {
    id: '05-infinite-scroll',
    tickets: [7],
    title: '無限スクロール（2 ページ目読み込み）',
    desc: 'sentinel が画面に入ると after カーソル付きで次ページを取得し、フィード末尾に追加する。',
    fullPage: true,
  })
})

test('モバイル幅（390px）でもフィードが崩れない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await gotoFeed(page)
  await expect(page.locator('.feed-card').first()).toBeVisible()

  // 横スクロールが発生していない（レイアウト崩れ検知）
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  )
  expect(overflow).toBe(false)

  await capture(page, {
    id: '06-mobile-feed',
    tickets: [7, 10],
    title: 'モバイル幅（390px）のフィード表示',
    desc: 'スマートフォン幅でもカードレイアウトとスワイプ UI が横スクロールなしで収まる。',
    fullPage: true,
  })
})
