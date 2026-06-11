import { test, expect } from '@playwright/test'
import { recordApi } from '../helpers/report'

// 設定 CRUD API（#23）— /api/settings の CRUD をテストする。
// フィルター設定の PATCH と NGワードの POST/DELETE を検証する。
// 前のテストスイート（30-settings）でスライダー値が変わっている可能性があるため、
// 各テスト前にフィルター設定をリセットする。

test.beforeAll(async ({ request }) => {
  await request.patch('/api/settings/filter', {
    data: { minScore: 5, minComments: 0, filterNsfw: true },
  })
})

test('GET /api/settings がフィルター設定と NGワードを返す', async ({ request }) => {
  const res = await request.get('/api/settings')
  expect(res.status()).toBe(200)
  const body = await res.json() as {
    filter: { minScore: number; minComments: number; filterNsfw: boolean }
    ngWords: { id: number; word: string; matchType: string; target: string }[]
  }

  // beforeAll でリセット済み
  expect(body.filter.minScore).toBe(5)
  expect(body.filter.filterNsfw).toBe(true)
  expect(typeof body.filter.minComments).toBe('number')
  expect(Array.isArray(body.ngWords)).toBe(true)
  // auth.setup でシードされた FILTERME が含まれる
  expect(body.ngWords.some((w) => w.word === 'FILTERME')).toBe(true)
  // 各 ngWord は id, word, matchType, target を持つ
  const first = body.ngWords[0]
  expect(typeof first.id).toBe('number')
  expect(typeof first.word).toBe('string')
  expect(typeof first.matchType).toBe('string')
  expect(typeof first.target).toBe('string')

  recordApi({
    id: '30-settings-get',
    tickets: [23],
    title: '設定取得 API',
    desc: 'GET /api/settings でフィルター設定と NGワード一覧を返す。',
    evidence: body,
  })
})

test('PATCH /api/settings/filter でフィルター設定を更新でき、GET に反映される', async ({ request }) => {
  const patch = await request.patch('/api/settings/filter', {
    data: { minScore: 100, minComments: 10, filterNsfw: false },
  })
  expect(patch.status()).toBe(200)
  const patched = await patch.json() as { minScore: number; minComments: number; filterNsfw: boolean }
  expect(patched.minScore).toBe(100)
  expect(patched.minComments).toBe(10)
  expect(patched.filterNsfw).toBe(false)

  const getRes = await request.get('/api/settings')
  const body = await getRes.json() as { filter: { minScore: number; minComments: number; filterNsfw: boolean } }
  expect(body.filter.minScore).toBe(100)
  expect(body.filter.minComments).toBe(10)
  expect(body.filter.filterNsfw).toBe(false)

  // 元に戻す
  await request.patch('/api/settings/filter', { data: { minScore: 5, minComments: 0, filterNsfw: true } })

  recordApi({
    id: '31-settings-patch-filter',
    tickets: [23],
    title: 'フィルター設定 PATCH API',
    desc: 'PATCH /api/settings/filter でフィルター設定を部分更新し、GET に即座に反映される。',
    evidence: { patched, restored: true },
  })
})

test('PATCH は指定フィールドのみ更新し、他フィールドは変わらない', async ({ request }) => {
  // minScore だけ更新
  await request.patch('/api/settings/filter', { data: { minScore: 50 } })
  const getRes = await request.get('/api/settings')
  const body = await getRes.json() as { filter: { minScore: number; minComments: number; filterNsfw: boolean } }
  expect(body.filter.minScore).toBe(50)
  // filterNsfw は beforeAll でリセットした true のまま
  expect(body.filter.filterNsfw).toBe(true)

  await request.patch('/api/settings/filter', { data: { minScore: 5 } })
})

test('POST /api/settings/ng-words で NGワードを追加でき、DELETE で削除できる', async ({ request }) => {
  const addRes = await request.post('/api/settings/ng-words', { data: { word: 'spam_test_word' } })
  expect(addRes.status()).toBe(201)
  const added = await addRes.json() as { id: number; word: string; matchType: string; target: string }
  expect(added.word).toBe('spam_test_word')
  expect(added.matchType).toBe('contains')
  expect(added.target).toBe('all')
  expect(added.id).toBeGreaterThan(0)

  const getRes = await request.get('/api/settings')
  const body = await getRes.json() as { ngWords: { id: number; word: string }[] }
  expect(body.ngWords.some((w) => w.word === 'spam_test_word')).toBe(true)

  const del = await request.delete(`/api/settings/ng-words/${added.id}`)
  expect(del.status()).toBe(204)

  const getRes2 = await request.get('/api/settings')
  const body2 = await getRes2.json() as { ngWords: { id: number; word: string }[] }
  expect(body2.ngWords.some((w) => w.word === 'spam_test_word')).toBe(false)

  recordApi({
    id: '32-settings-ng-words-crud',
    tickets: [23],
    title: 'NGワード CRUD API',
    desc: 'POST /api/settings/ng-words で追加、DELETE /api/settings/ng-words/:id で削除。D1 に永続化される。',
    evidence: { added, deleted: added.id },
  })
})

test('POST /api/settings/ng-words に matchType と target を指定できる', async ({ request }) => {
  const addRes = await request.post('/api/settings/ng-words', {
    data: { word: 'exact_test_word', matchType: 'exact', target: 'title' },
  })
  expect(addRes.status()).toBe(201)
  const added = await addRes.json() as { id: number; matchType: string; target: string }
  expect(added.matchType).toBe('exact')
  expect(added.target).toBe('title')

  await request.delete(`/api/settings/ng-words/${added.id}`)
})

test('POST /api/settings/ng-words — word が空の場合は 400 を返す', async ({ request }) => {
  const res = await request.post('/api/settings/ng-words', { data: { word: '' } })
  expect(res.status()).toBe(400)
})

test('未認証リクエストは 401 を返す', async ({ playwright }) => {
  const anon = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:8787',
    storageState: { cookies: [], origins: [] },
  })
  try {
    const res = await anon.get('/api/settings')
    expect(res.status()).toBe(401)
  } finally {
    await anon.dispose()
  }
})
