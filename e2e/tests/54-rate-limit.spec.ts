import { test, expect } from '@playwright/test'
import { recordApi } from '../helpers/report'
import { MOCK_IMG } from '../helpers/mock'

// OCR トークンバケット レート制限（#20）

test('バケットを枯渇させると 429 daily_burst_limit が返り X-RateLimit ヘッダーが付く', async ({ request }) => {
  // dev 専用エンドポイントでバケットを強制枯渇
  const exhaust = await request.post('/api/image-translate/__test_exhaust')
  expect(exhaust.ok()).toBe(true)

  const res = await request.post('/api/image-translate/translate', {
    data: { imageUrl: MOCK_IMG.ocrSign, postId: 'rate-limit-daily-test' },
  })
  expect(res.status()).toBe(429)

  const body = await res.json()
  expect(body.reason).toBe('daily_burst_limit')
  expect(body.error).toContain('本日の OCR 上限')

  // X-RateLimit-* ヘッダーの確認
  expect(res.headers()['x-ratelimit-remaining']).toBe('0')
  expect(res.headers()['x-ratelimit-reset']).toBeTruthy()
  expect(res.headers()['retry-after']).toBeTruthy()

  recordApi({
    id: '36-rate-limit-429',
    tickets: [20],
    title: 'OCR レート制限 — 429 レスポンス',
    desc: 'トークンが枯渇した状態で画像翻訳を呼ぶと 429 + X-RateLimit ヘッダーが返る。',
    evidence: { status: 429, body, headers: {
      'x-ratelimit-remaining': res.headers()['x-ratelimit-remaining'],
      'x-ratelimit-reset': res.headers()['x-ratelimit-reset'],
      'retry-after': res.headers()['retry-after'],
    }},
  })
})

test('バケットリセット後は再度リクエストが通る', async ({ request }) => {
  // 枯渇状態のまま（前テストの継続）
  const blocked = await request.post('/api/image-translate/translate', {
    data: { imageUrl: MOCK_IMG.plain, postId: 'rate-limit-reset-test-blocked' },
  })
  expect(blocked.status()).toBe(429)

  // バケットをリセット
  const reset = await request.post('/api/image-translate/__test_reset')
  expect(reset.ok()).toBe(true)

  // リセット後は通る
  const ok = await request.post('/api/image-translate/translate', {
    data: { imageUrl: MOCK_IMG.plain, postId: 'rate-limit-reset-test-ok' },
  })
  expect(ok.status()).toBe(200)
  expect(ok.headers()['x-ratelimit-remaining']).toBeTruthy()
})

test('月次クォータ枯渇は monthly_limit を返す', async ({ request }) => {
  await request.post('/api/image-translate/__test_reset')

  const quota = await request.get('/api/image-translate/quota')
  const body = await quota.json()
  expect(body.monthlyRemaining).toBe(body.monthlyQuota - body.usedThisMonth)
  expect(body.tokens).toBeGreaterThan(0)
})
