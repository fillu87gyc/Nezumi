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

test('/auth/login は Reddit password grant で認証し / へリダイレクトして session Cookie を設定する', async ({ playwright }) => {
  const anon = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:8787',
    storageState: EMPTY_STATE,
    maxRedirects: 0,
  })
  const res = await anon.get('/auth/login')
  expect(res.status()).toBe(302)
  expect(res.headers()['location']).toBe('/')
  const setCookie = res.headers()['set-cookie'] ?? ''
  expect(setCookie, 'session Cookie が設定される').toMatch(/session=/)
  expect(setCookie, 'logged_in Cookie が設定される').toMatch(/logged_in=1/)
  await anon.dispose()

  recordApi({
    id: '21-login-direct',
    tickets: [3],
    title: 'ログイン — password grant で即時認証',
    desc: '/auth/login が Reddit password grant を呼び出し、成功すると / へリダイレクトして session / logged_in Cookie を設定する。',
    evidence: { location: '/', cookies: ['session', 'logged_in'] },
  })
})

test('ログアウトで Cookie が無効化され、以後の API アクセスは 401 になる', async ({ playwright }) => {
  // 新しいコンテキストで実ログイン
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
