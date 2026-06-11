import { test as setup, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { capture } from '../helpers/report'
import { mockConfig } from '../helpers/mock'
import { d1Execute } from '../helpers/d1'

const STORAGE_STATE = join(__dirname, '..', '.auth', 'alice.json')

// 実 OAuth フロー（モック Reddit 経由）でログインし、セッションを保存する。
// このセットアップ中はフィードを fail させ、シード前のレスポンスが
// KV にキャッシュされないようにしている（cache:{URL} は 60 秒生きるため）。
setup('OAuth ログイン → セッション保存 → D1 フィルター設定シード', async ({ page, context }) => {
  await mockConfig({ failFeed: true, currentUser: 'alice', tokenExpiresIn: 3600 })

  // 未ログイン: ログイン画面が表示される
  await page.goto('/')
  await expect(page.locator('.login-card h1')).toHaveText('Nezumi')
  await expect(page.locator('a.login-btn')).toHaveText('Reddit でログイン')
  await capture(page, {
    id: '01-login-screen',
    tickets: [3, 7],
    title: 'ログイン画面',
    desc: '未ログイン時は Reddit OAuth へ誘導するログイン画面のみが表示される。',
  })

  // ログインボタン → /auth/login → モック Reddit 認可 → /auth/callback → /
  await page.locator('a.login-btn').click()
  await page.waitForURL('http://127.0.0.1:8787/')
  await expect(page.locator('.nav-brand')).toHaveText('Nezumi')

  // セッション Cookie の属性検証（#3 AC-2）
  const cookies = await context.cookies('http://127.0.0.1:8787')
  const session = cookies.find((c) => c.name === 'session')
  expect(session, 'session Cookie が設定される').toBeTruthy()
  expect(session?.httpOnly).toBe(true)
  expect(session?.sameSite).toBe('Lax')
  const loggedIn = cookies.find((c) => c.name === 'logged_in')
  expect(loggedIn, 'logged_in コンパニオン Cookie が設定される').toBeTruthy()
  expect(loggedIn?.httpOnly).toBe(false)

  // フィード取得失敗時のエラー UI（リトライ 1 回の後に表示される）
  await expect(page.locator('.feed-error')).toBeVisible({ timeout: 20_000 })
  await capture(page, {
    id: '02-feed-error',
    tickets: [7],
    title: 'フィード読み込み失敗時のエラー表示',
    desc: 'バックエンド（Reddit API）障害時にスケルトンではなくエラーメッセージを表示する。',
  })

  mkdirSync(join(__dirname, '..', '.auth'), { recursive: true })
  await context.storageState({ path: STORAGE_STATE })

  // ログインで D1 に作成された users 行へフィルター設定をシードする（#16/#17）。
  // 書き込み API は未実装（チケット #23）のため、E2E では D1 を直接シードする。
  d1Execute(
    `UPDATE users SET settings = '{"minScore":5,"minComments":0,"filterNsfw":true}' WHERE id = 'u_alice'`
  )
  d1Execute(
    `INSERT INTO ng_words (user_id, word, match_type, target) VALUES ('u_alice', 'FILTERME', 'contains', 'all')`
  )

  await mockConfig({ failFeed: false })
})
