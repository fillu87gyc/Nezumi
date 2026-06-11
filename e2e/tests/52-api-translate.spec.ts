import { test, expect } from '@playwright/test'
import { recordApi } from '../helpers/report'
import { mockStats } from '../helpers/mock'

// DeepL 翻訳プロキシ API（#8）

test('POST /api/translate/text が翻訳を返し、2 回目は KV キャッシュから返る', async ({ request }) => {
  const text = 'Hello from the E2E translation cache test'

  const before = (await mockStats()).deeplCalls
  const first = await request.post('/api/translate/text', { data: { text } })
  const firstBody = await first.json()
  expect(firstBody).toEqual({ translated: `【JA】${text}` })

  const second = await request.post('/api/translate/text', { data: { text } })
  const secondBody = await second.json()
  expect(secondBody).toEqual({ translated: `【JA】${text}`, cached: true })

  // DeepL へのリクエストは 1 回だけ
  expect((await mockStats()).deeplCalls - before).toBe(1)

  recordApi({
    id: '30-translate-text',
    tickets: [8],
    title: '単一テキスト翻訳 + KV キャッシュ',
    desc: '同一テキストの 2 回目は cached: true で KV から返り、DeepL API を呼ばない（無料枠の節約）。',
    evidence: { first: firstBody, second: secondBody },
  })
})

test('空テキストは DeepL を呼ばず { translated: "" } を返す', async ({ request }) => {
  const before = (await mockStats()).deeplCalls
  const res = await request.post('/api/translate/text', { data: { text: '' } })
  expect(await res.json()).toEqual({ translated: '' })
  expect((await mockStats()).deeplCalls).toBe(before)
})

test('targetLang を指定して翻訳できる', async ({ request }) => {
  const res = await request.post('/api/translate/text', {
    data: { text: 'language override test', targetLang: 'DE', sourceLang: 'EN' },
  })
  expect((await res.json()).translated).toBe('【JA】language override test')
  // モックに source_lang / target_lang が渡っている
  const stats = await mockStats()
  expect(stats.lastDeeplBody).toMatchObject({ target_lang: 'DE', source_lang: 'EN' })
})

test('POST /api/translate/batch が複数投稿（selftext 含む）を一括翻訳する', async ({ request }) => {
  const texts = [
    { id: 'b1', title: 'Batch title one', selftext: 'Batch body one' },
    { id: 'b2', title: 'Batch title two' },
  ]
  const before = (await mockStats()).deeplCalls

  const res = await request.post('/api/translate/batch', { data: { texts } })
  const body = await res.json()
  expect(body.results).toEqual({
    b1: { title: '【JA】Batch title one', selftext: '【JA】Batch body one' },
    b2: { title: '【JA】Batch title two' },
  })
  // 3 テキストが 1 チャンク = DeepL 1 コールにまとめられる
  expect((await mockStats()).deeplCalls - before).toBe(1)

  // 2 回目は全てキャッシュヒットで DeepL を呼ばない
  const cached = await request.post('/api/translate/batch', { data: { texts } })
  expect((await cached.json()).results.b1.title).toBe('【JA】Batch title one')
  expect((await mockStats()).deeplCalls - before).toBe(1)

  recordApi({
    id: '31-translate-batch',
    tickets: [8],
    title: 'バッチ翻訳 API',
    desc: '複数投稿の title / selftext を 50 テキスト単位のチャンクで一括翻訳し、結果を投稿 ID でマップして返す。',
    evidence: body,
  })
})
