import { test, expect, type Page } from '@playwright/test'
import { capture } from '../helpers/report'
import { mockStats } from '../helpers/mock'

// ImageSwipe（#11/#12）: 画像を翻訳パネルへスワイプすると
// Workers が画像を取得 → Claude Vision（モック）で OCR + 翻訳して返す。

async function gotoFeed(page: Page) {
  await page.goto('/')
  await expect(page.locator('.feed-card').first()).toBeVisible({ timeout: 20_000 })
}

function swipeToTranslatePanel(card: ReturnType<Page['locator']>) {
  return card.locator('.image-swipe-track').evaluate((el) => {
    el.scrollTo({ left: el.clientWidth, behavior: 'instant' as ScrollBehavior })
  })
}

test('テキスト入り画像をスワイプすると OCR + 日本語翻訳がオーバーレイ表示される', async ({ page }) => {
  await gotoFeed(page)

  const card = page.locator('.feed-card', { hasText: 'road sign' })
  await expect(card.locator('.swipe-hint')).toContainText('スワイプで翻訳')

  const before = (await mockStats()).claudeCalls
  await swipeToTranslatePanel(card)

  // Claude Vision モックの翻訳結果（textRegions）が表示される
  await expect(card.locator('.text-card').first()).toBeVisible({ timeout: 20_000 })
  await expect(card.locator('.trans-text').nth(1)).toHaveText('ネズミ横断中')
  await expect(card.locator('.orig-text').nth(1)).toHaveText('Mice crossing ahead')

  const after = (await mockStats()).claudeCalls
  expect(after - before, 'スワイプ 1 回で Claude API は 1 回だけ呼ばれる').toBe(1)

  await capture(page, {
    id: '07-image-swipe-ocr',
    tickets: [11, 12],
    title: 'ImageSwipe — 画像内テキストの OCR + 翻訳',
    desc: '画像を左スワイプすると Claude Vision による OCR + 日本語翻訳が原文付きでオーバーレイ表示される。',
  })

  // 戻って再度スワイプしても API は再呼び出しされない（#12 AC-5）
  await card.locator('.image-swipe-track').evaluate((el) => {
    el.scrollTo({ left: 0, behavior: 'instant' as ScrollBehavior })
  })
  await swipeToTranslatePanel(card)
  await expect(card.locator('.text-card').first()).toBeVisible()
  expect((await mockStats()).claudeCalls).toBe(after)
})

test('テキストのない画像では「テキストが見つかりませんでした」と表示される', async ({ page }) => {
  await gotoFeed(page)

  const card = page.locator('.feed-card', { hasText: 'Sunset over Mount Fuji' })
  await swipeToTranslatePanel(card)

  await expect(card.locator('.no-text')).toHaveText('テキストが見つかりませんでした', {
    timeout: 20_000,
  })

  await capture(page, {
    id: '08-image-swipe-notext',
    tickets: [11, 12],
    title: 'ImageSwipe — テキストなし画像のフォールバック',
    desc: 'OCR 対象テキストがない画像では翻訳パネルにフォールバックメッセージを表示する。',
  })
})
