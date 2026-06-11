import { test, expect } from '@playwright/test'
import { recordApi } from '../helpers/report'
import { mockConfig, mockStats } from '../helpers/mock'
import type { Post, Comment } from '../../src/api-types'

// フィード API（#5/#6/#9/#16/#17）+ トークンリフレッシュ（#3）。
// KV キャッシュのキーは URL 全体なので、テストごとに limit 値を変えて干渉を防ぐ。
// この request fixture には setup でログインした alice のセッションが入っている。

interface FeedResponse {
  posts: Post[]
  after: string | null
}

test('GET /api/feed/home が正規化された投稿と after カーソルを返す', async ({ request }) => {
  const res = await request.get('/api/feed/home?limit=31&translate=false')
  expect(res.status()).toBe(200)
  const body = (await res.json()) as FeedResponse

  expect(body.after).toBe('cursor_page2')
  const post = body.posts.find((p) => p.id === 'textpost1')
  expect(post).toMatchObject({
    id: 'textpost1',
    title: 'TIL the Japanese word for mouse is "nezumi"',
    author: 'wordnerd',
    subreddit: 'todayilearned',
    score: 4821,
    numComments: 312,
    flair: 'Language',
    nsfw: false,
    permalink: 'https://www.reddit.com/r/todayilearned/comments/textpost1/',
  })
  // 画像投稿は preview が抽出される
  const img = body.posts.find((p) => p.id === 'imgocr1')
  expect(img?.preview).toContain('/img/ocr-sign.png')

  recordApi({
    id: '22-feed-api',
    tickets: [5],
    title: 'フィード API — 正規化レスポンス',
    desc: 'Reddit の生レスポンスを { posts, after } に正規化し、preview 抽出・permalink 組み立てを行う。',
    evidence: { after: body.after, samplePost: post },
  })
})

test('sort / after パラメータが Reddit API へ引き渡される', async ({ request }) => {
  await request.get('/api/feed/home?sort=new&limit=32&translate=false')
  const stats = await mockStats()
  expect(stats.requests.some((r) => r.startsWith('GET /new?sort=new&limit=32'))).toBe(true)

  const page2 = await request.get('/api/feed/home?after=cursor_page2&limit=33&translate=false')
  const body = (await page2.json()) as FeedResponse
  expect(body.posts.some((p) => p.id === 'page2post1')).toBe(true)
  expect(body.after).toBeNull()
})

test('サブレディット別フィードにも D1 の NG ワードフィルターが効く', async ({ request }) => {
  const res = await request.get('/api/feed/r/japanlife?limit=34&translate=false')
  const body = (await res.json()) as FeedResponse
  expect(body.posts.some((p) => p.id === 'jl1')).toBe(true)
  // FILTERME を含む jl2 は alice の NG ワードで除外される
  expect(body.posts.some((p) => p.id === 'jl2')).toBe(false)

  recordApi({
    id: '23-subreddit-feed',
    tickets: [5, 17],
    title: 'サブレディット別フィード + NG ワード',
    desc: '/api/feed/r/:subreddit でも D1 の NG ワードフィルターがサーバーサイドで適用される。',
    evidence: { posts: body.posts.map((p) => p.id) },
  })
})

test('translate=true で titleJa / selftextJa が付加され、false では付かない', async ({ request }) => {
  const translated = await request.get('/api/feed/home?limit=35')
  const tBody = (await translated.json()) as FeedResponse
  const post = tBody.posts.find((p) => p.id === 'textpost1')
  expect(post?.titleJa).toBe('【JA】TIL the Japanese word for mouse is "nezumi"')
  expect(post?.selftextJa).toContain('【JA】I learned this')

  const raw = await request.get('/api/feed/home?limit=36&translate=false')
  const rBody = (await raw.json()) as FeedResponse
  const rawPost = rBody.posts.find((p) => p.id === 'textpost1')
  expect(rawPost?.titleJa).toBeUndefined()
  expect(rawPost?.selftextJa).toBeUndefined()

  recordApi({
    id: '24-feed-translate',
    tickets: [8, 9],
    title: 'フィード自動翻訳統合',
    desc: 'translate=true（デフォルト）で DeepL バッチ翻訳の titleJa / selftextJa が付加される。translate=false で原文のみ。',
    evidence: { translated: { titleJa: post?.titleJa, selftextJa: post?.selftextJa }, raw: { titleJa: rawPost?.titleJa ?? null } },
  })
})

test('翻訳結果は KV にキャッシュされ、2 回目は DeepL を呼ばない', async ({ request }) => {
  // limit=35 のテストで全投稿の翻訳がキャッシュ済み。
  // 新しい URL（limit=37）でも同一テキストなので DeepL コールは増えない。
  const before = (await mockStats()).deeplCalls
  const res = await request.get('/api/feed/home?limit=37')
  const body = (await res.json()) as FeedResponse
  expect(body.posts.find((p) => p.id === 'textpost1')?.titleJa).toContain('【JA】')
  expect((await mockStats()).deeplCalls).toBe(before)
})

test('KV キャッシュミドルウェア: 同一 URL の 2 回目は X-Cache: HIT', async ({ request }) => {
  const first = await request.get('/api/feed/home?limit=38&translate=false')
  expect(first.headers()['x-cache']).toBe('MISS')
  const feedReqs = (await mockStats()).feedRequests

  const second = await request.get('/api/feed/home?limit=38&translate=false')
  expect(second.headers()['x-cache']).toBe('HIT')
  expect((await second.json()) as FeedResponse).toEqual((await first.json()) as FeedResponse)
  // Reddit API への問い合わせは増えていない
  expect((await mockStats()).feedRequests).toBe(feedReqs)

  recordApi({
    id: '25-kv-cache',
    tickets: [6],
    title: 'KV キャッシュミドルウェア',
    desc: '同一 URL のフィードは KV から返り（X-Cache: HIT）、Reddit API のレート制限を消費しない。',
    evidence: { first: 'X-Cache: MISS', second: 'X-Cache: HIT' },
  })
})

test('購読サブレディット一覧を返す', async ({ request }) => {
  const res = await request.get('/api/feed/subreddits')
  const body = (await res.json()) as { subreddits: { name: string; title: string; subscribers: number; icon: string }[] }
  expect(body.subreddits.map((s) => s.name)).toEqual(['japanlife', 'todayilearned', 'ramen'])
  // icon_img / community_icon のどちらからでも icon が解決される
  expect(body.subreddits[0].icon).toContain('/img/plain.png')
  expect(body.subreddits[1].icon).toContain('/img/plain.png')

  recordApi({
    id: '26-subreddits',
    tickets: [5],
    title: '購読サブレディット一覧',
    desc: '/api/feed/subreddits が { name, title, icon, subscribers } の配列を返す。',
    evidence: body,
  })
})

test('投稿詳細 API がコメントツリー（ネスト・kind フィルタ済み）を返す', async ({ request }) => {
  const res = await request.get('/api/feed/post/textpost1')
  const body = (await res.json()) as { post: Post; comments: Comment[] }

  expect(body.post.id).toBe('textpost1')
  // kind: 'more' は除外され t1 コメントのみ
  expect(body.comments).toHaveLength(2)
  expect(body.comments[0]).toMatchObject({ id: 'c1', author: 'linguist', depth: 0 })
  // ネストした返信は depth 付きで再帰的に正規化される
  expect(body.comments[0].replies[0]).toMatchObject({ id: 'c1r1', depth: 1 })
  expect(body.comments[1].replies).toEqual([])

  recordApi({
    id: '27-post-detail',
    tickets: [5],
    title: '投稿詳細 + コメントツリー',
    desc: '/api/feed/post/:postId が投稿と再帰正規化されたコメントツリー（kind=t1 のみ、depth 付き）を返す。',
    evidence: body,
  })
})

test('期限切れアクセストークンは自動リフレッシュされる', async ({ playwright }) => {
  // bob は 30 秒で切れるトークンでログインさせ、リフレッシュフローを誘発する
  await mockConfig({ currentUser: 'bob', tokenExpiresIn: 30 })
  const bob = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:8787',
    storageState: { cookies: [], origins: [] },
  })
  try {
    await bob.get('/auth/login')

    const before = (await mockStats()).tokenGrants.refresh_token
    const res = await bob.get('/api/feed/home?limit=39&translate=false')
    expect(res.status()).toBe(200)
    const after = (await mockStats()).tokenGrants.refresh_token
    expect(after, 'refresh_token グラントが発行される').toBeGreaterThan(before)

    recordApi({
      id: '28-token-refresh',
      tickets: [3],
      title: 'アクセストークン自動リフレッシュ',
      desc: '有効期限 60 秒前を切ったトークンは API 呼び出し時に refresh_token グラントで自動更新される。',
      evidence: { refreshGrantsBefore: before, refreshGrantsAfter: after },
    })
  } finally {
    await bob.dispose()
    await mockConfig({ currentUser: 'alice', tokenExpiresIn: 3600 })
  }
})

test('フィルター設定はユーザー単位（bob には適用されない）', async ({ playwright, request }) => {
  await mockConfig({ currentUser: 'bob', tokenExpiresIn: 3600 })
  const bob = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:8787',
    storageState: { cookies: [], origins: [] },
  })
  try {
    await bob.get('/auth/login')

    // bob: D1 にフィルター設定がない → 7 投稿すべて見える
    const bobRes = await bob.get('/api/feed/home?limit=41&translate=false')
    const bobBody = (await bobRes.json()) as FeedResponse
    expect(bobBody.posts).toHaveLength(7)
    expect(bobBody.posts.some((p) => p.id === 'ngword1')).toBe(true)
    expect(bobBody.posts.some((p) => p.id === 'nsfwpost1')).toBe(true)

    // alice: D1 シード済み設定で 4 投稿に絞られる
    const aliceRes = await request.get('/api/feed/home?limit=42&translate=false')
    const aliceBody = (await aliceRes.json()) as FeedResponse
    expect(aliceBody.posts).toHaveLength(4)
    expect(aliceBody.posts.map((p) => p.id)).toEqual(['textpost1', 'imgocr1', 'imgplain1', 'textpost2'])

    recordApi({
      id: '29-filter-per-user',
      tickets: [16, 17],
      title: 'D1 ユーザー別フィルタリング',
      desc: 'NG ワード・最低スコア・NSFW フィルターは D1 のユーザー設定から読まれ、ユーザーごとに独立して適用される。',
      evidence: { bobPosts: bobBody.posts.map((p) => p.id), alicePosts: aliceBody.posts.map((p) => p.id) },
    })
  } finally {
    await bob.dispose()
    await mockConfig({ currentUser: 'alice', tokenExpiresIn: 3600 })
  }
})

test('再ログインしても D1 の設定・NG ワードは消えない', async ({ playwright, request }) => {
  // alice を再ログインさせる（users 行が INSERT で上書きされないことの検証）
  const relogin = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:8787',
    storageState: { cookies: [], origins: [] },
  })
  await relogin.get('/auth/login')
  await relogin.dispose()

  const res = await request.get('/api/feed/home?limit=43&translate=false')
  const body = (await res.json()) as FeedResponse
  expect(body.posts, '再ログイン後もフィルターが効いている').toHaveLength(4)
})
