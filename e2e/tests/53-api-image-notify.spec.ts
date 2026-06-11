import { test, expect } from '@playwright/test'
import { recordApi } from '../helpers/report'
import { mockStats, MOCK_IMG } from '../helpers/mock'

// 画像翻訳 API（#11）と通知バックエンド（#14）

test('画像翻訳 API がテキスト入り画像を OCR + 翻訳し、結果を KV キャッシュする', async ({ request }) => {
  const before = (await mockStats()).claudeCalls

  const res = await request.post('/api/image-translate/translate', {
    data: { imageUrl: MOCK_IMG.ocrSign, postId: 'api-ocr-test' },
  })
  const body = await res.json()
  expect(body.hasText).toBe(true)
  expect(body.translatedText).toContain('ネズミ横断中')
  expect(body.textRegions).toHaveLength(3)
  expect(body.textRegions[0]).toEqual({ original: 'CAUTION', translated: '注意' })

  // 同一 postId の 2 回目は KV キャッシュから返り、Claude API を呼ばない
  const cached = await request.post('/api/image-translate/translate', {
    data: { imageUrl: MOCK_IMG.ocrSign, postId: 'api-ocr-test' },
  })
  expect((await cached.json()).hasText).toBe(true)
  expect((await mockStats()).claudeCalls - before).toBe(1)

  recordApi({
    id: '32-image-translate',
    tickets: [11],
    title: '画像翻訳 API（Claude Vision OCR）',
    desc: '画像 URL を受け取り Claude Vision で OCR + 日本語翻訳。結果は postId 単位で KV に 7 日キャッシュされる。',
    evidence: body,
  })
})

test('テキストのない画像は hasText: false を返す', async ({ request }) => {
  const res = await request.post('/api/image-translate/translate', {
    data: { imageUrl: MOCK_IMG.plain, postId: 'api-plain-test' },
  })
  expect(await res.json()).toEqual({
    hasText: false,
    originalText: '',
    translatedText: '',
    textRegions: [],
  })
})

test('取得できない画像 URL は 400 を返す', async ({ request }) => {
  const res = await request.post('/api/image-translate/translate', {
    data: { imageUrl: 'http://127.0.0.1:9377/img/no-such.png', postId: 'api-404-test' },
  })
  expect(res.status()).toBe(400)
  expect(await res.json()).toEqual({ error: 'Image fetch failed' })
})

test('OCR クォータエンドポイントが応答する', async ({ request }) => {
  const res = await request.get('/api/image-translate/quota')
  expect(await res.json()).toEqual({ status: 'ok' })
})

test('Push 購読の保存と未読メッセージ取得', async ({ request }) => {
  const subscription = {
    endpoint: 'https://push.example/mock-endpoint',
    keys: { p256dh: 'mock-p256dh', auth: 'mock-auth' },
  }
  const sub = await request.post('/api/notify/subscribe', { data: subscription })
  expect(await sub.json()).toEqual({ ok: true })

  const unread = await request.get('/api/notify/unread')
  const body = await unread.json()
  expect(body.count).toBe(2)
  expect(body.messages[0]).toMatchObject({
    id: 'msg1',
    subject: 'comment reply',
    author: 'linguist',
    type: 'comment_reply',
  })

  recordApi({
    id: '33-notify',
    tickets: [14],
    title: 'Push 購読 + 未読通知 API',
    desc: 'PushSubscription を KV に保存し、Reddit の未読メッセージ（返信・DM）を取得できる。',
    evidence: body,
  })
})

test('Cron Trigger（15 分ポーリング）が購読ユーザーの未読を確認する', async ({ request }) => {
  // 直前のテストで alice の push-sub が KV に入っている。
  // wrangler dev --test-scheduled の /__scheduled で scheduled ハンドラを発火する。
  const before = (await mockStats()).unreadCalls
  const res = await request.get('http://127.0.0.1:8787/__scheduled?cron=*/15+*+*+*+*')
  expect(res.ok()).toBe(true)
  const after = (await mockStats()).unreadCalls
  expect(after, 'scheduled ハンドラが Reddit 未読をポーリングする').toBeGreaterThan(before)

  recordApi({
    id: '34-cron-push-poll',
    tickets: [14],
    title: 'Cron Trigger — 未読ポーリング',
    desc: 'Cron Trigger（*/15）で scheduled ハンドラが起動し、push 購読済みユーザーの Reddit 未読を確認する。',
    evidence: { unreadCallsBefore: before, unreadCallsAfter: after },
  })
})
