import { test, expect } from '@playwright/test'
import { recordApi } from '../helpers/report'

// 認証まわりの API 仕様（#3/#4）。ブラウザを介さず HTTP レベルで検証する。

// project の storageState（alice セッション）を継承させないための空ステート
const EMPTY_STATE = { cookies: [], origins: [] }

test('未認証で /api/* にアクセスすると 401 が返る', async ({ playwright }) => {
  const anon = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:8787',
    storageState: EMPTY_STATE,
  })
  for (const path of ['/api/feed/home', '/api/feed/subreddits', '/api/notify/unread']) {
    const res = await anon.get(path)
    expect(res.status(), path).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  }
  // 翻訳系も保護されている
  const res = await anon.post('/api/translate/text', { data: { text: 'hi' } })
  expect(res.status()).toBe(401)
  await anon.dispose()

  recordApi({
    id: '20-auth-401',
    tickets: [4],
    title: '認証ミドルウェア — 未認証は 401',
    desc: 'session Cookie なしで保護エンドポイントにアクセスすると一律 401 Unauthorized になる。',
    evidence: { status: 401, body: { error: 'Unauthorized' } },
  })
})

test('改ざんされた JWT は 401 Invalid token になる', async ({ playwright }) => {
  const forged = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:8787',
    storageState: EMPTY_STATE,
    extraHTTPHeaders: { cookie: 'session=eyJhbGciOiJIUzI1NiJ9.forged.signature' },
  })
  const res = await forged.get('/api/feed/home')
  expect(res.status()).toBe(401)
  expect(await res.json()).toEqual({ error: 'Invalid token' })
  await forged.dispose()
})

test('/auth/login は state と duration=permanent 付きで Reddit 認可 URL へリダイレクトする', async ({ playwright }) => {
  const anon = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:8787',
    storageState: EMPTY_STATE,
    maxRedirects: 0,
  })
  const res = await anon.get('/auth/login')
  expect(res.status()).toBe(302)
  const location = res.headers()['location']
  const url = new URL(location)
  expect(url.pathname).toBe('/api/v1/authorize')
  expect(url.searchParams.get('state')).toBeTruthy()
  expect(url.searchParams.get('duration')).toBe('permanent')
  expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:8787/auth/callback')
  expect(url.searchParams.get('client_id')).toBe('e2e-client-id')
  await anon.dispose()

  recordApi({
    id: '21-oauth-login-redirect',
    tickets: [3],
    title: 'OAuth — 認可 URL リダイレクト',
    desc: '/auth/login が CSRF 対策の state と refresh_token 発行に必須の duration=permanent を含む認可 URL へリダイレクトする。',
    evidence: { location },
  })
})

test('不正な state で callback に来ると /?error=invalid_state に逃がす', async ({ playwright }) => {
  const anon = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:8787',
    storageState: EMPTY_STATE,
    maxRedirects: 0,
  })
  const res = await anon.get('/auth/callback?code=evil&state=never-issued')
  expect(res.status()).toBe(302)
  expect(res.headers()['location']).toContain('error=invalid_state')

  // Reddit 側でユーザーが拒否した場合（error パラメータ）もエラーとして戻す
  const denied = await anon.get('/auth/callback?error=access_denied')
  expect(denied.status()).toBe(302)
  expect(denied.headers()['location']).toContain('error=access_denied')
  await anon.dispose()
})

test('ログアウトで Cookie が無効化され、以後の API アクセスは 401 になる', async ({ playwright }) => {
  // 新しいコンテキストで実ログイン（モック Reddit 経由のリダイレクトチェーン）
  const ctx = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:8787',
    storageState: EMPTY_STATE,
  })
  await ctx.get('/auth/login')

  const ok = await ctx.get('/api/feed/home?limit=29')
  expect(ok.status()).toBe(200)

  const logout = await ctx.post('/auth/logout')
  expect(await logout.json()).toEqual({ ok: true })

  const after = await ctx.get('/api/feed/home?limit=28')
  expect(after.status()).toBe(401)
  await ctx.dispose()
})
