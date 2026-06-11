// E2E 用モック外部 API サーバー。
//
// Reddit（www.reddit.com / oauth.reddit.com 相当）として振る舞うのが主目的。
// DeepL / Claude は API キーが無いと実呼び出しできない外部 SaaS のため、
// 同じ理由（決定的なフィクスチャ応答）でここに同居させている。
// アプリ自身のスタック（Workers / KV / D1 / React クライアント）は一切モックしない。
//
// パスは衝突しないため 1 ポートで全サービスを提供する:
//   Reddit www   : GET /api/v1/authorize, POST /api/v1/access_token
//   Reddit oauth : GET /api/v1/me, /hot|/new|/top, /r/:sub/:sort, /subreddits/mine/subscriber,
//                  /comments/:id, /message/unread
//   DeepL        : POST /v2/translate
//   Claude       : POST /v1/messages
//   画像         : GET /img/*.png
//   制御         : GET /__mock/health, GET /__mock/stats, POST /__mock/config, POST /__mock/reset

import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  MOCK_PORT, USERS, HOME_PAGE1, HOME_PAGE2, SUBREDDIT_FEEDS, SUBREDDITS, COMMENTS, UNREAD_MESSAGES,
} from './fixtures.mjs'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')
const IMAGES = {
  'ocr-sign.png': readFileSync(join(FIXTURES_DIR, 'ocr-sign.png')),
  'plain.png': readFileSync(join(FIXTURES_DIR, 'plain.png')),
}
const OCR_SIGN_BASE64 = IMAGES['ocr-sign.png'].toString('base64')

const initialConfig = () => ({
  currentUser: 'alice', // /api/v1/me が返すユーザー
  tokenExpiresIn: 3600, // access_token の有効期間（秒）。短くすると refresh フローを誘発できる
  failFeed: false, // true でフィード系エンドポイントが 500 を返す
})

let config = initialConfig()
let stats
resetStats()

function resetStats() {
  stats = {
    tokenGrants: { authorization_code: 0, refresh_token: 0 },
    feedRequests: 0,
    deeplCalls: 0,
    deeplTexts: 0,
    claudeCalls: 0,
    unreadCalls: 0,
    issuedTokens: 0,
    lastDeeplBody: null,
    requests: [],
  }
}

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

const readBody = (req) =>
  new Promise((resolve) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => resolve(data))
  })

// DeepL の代わり: 決定的な疑似翻訳。テストは「【JA】」プレフィックスで翻訳済みを検出する
const pseudoTranslate = (text) => `【JA】${text}`

const listing = (children, after) => ({ data: { children, after: after ?? null } })

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${MOCK_PORT}`)
  const path = url.pathname
  stats.requests.push(`${req.method} ${path}${url.search}`)

  // ---- 制御 ----
  if (path === '/__mock/health') return json(res, 200, { ok: true })
  if (path === '/__mock/stats') return json(res, 200, { ...stats, config })
  if (path === '/__mock/config' && req.method === 'POST') {
    Object.assign(config, JSON.parse(await readBody(req)))
    return json(res, 200, { ok: true, config })
  }
  if (path === '/__mock/reset' && req.method === 'POST') {
    config = initialConfig()
    resetStats()
    return json(res, 200, { ok: true })
  }

  // ---- 画像 ----
  if (path.startsWith('/img/')) {
    const img = IMAGES[path.slice('/img/'.length)]
    if (!img) return json(res, 404, { error: 'no such image' })
    res.writeHead(200, { 'content-type': 'image/png', 'content-length': img.length })
    return res.end(img)
  }

  // ---- Reddit www: OAuth ----
  if (path === '/api/v1/authorize') {
    // 本物の Reddit は認可画面を出すが、E2E では即座に許可したものとして
    // redirect_uri へ code + state を付けて戻す
    const redirectUri = url.searchParams.get('redirect_uri')
    const state = url.searchParams.get('state')
    const location = `${redirectUri}?code=mock_auth_code&state=${encodeURIComponent(state ?? '')}`
    res.writeHead(302, { location })
    return res.end()
  }
  if (path === '/api/v1/access_token' && req.method === 'POST') {
    const body = new URLSearchParams(await readBody(req))
    const grantType = body.get('grant_type')
    if (grantType in stats.tokenGrants) stats.tokenGrants[grantType]++
    stats.issuedTokens++
    return json(res, 200, {
      access_token: `mock_access_${stats.issuedTokens}`,
      refresh_token: 'mock_refresh_token',
      token_type: 'bearer',
      expires_in: config.tokenExpiresIn,
      scope: 'read identity',
    })
  }

  // ---- Reddit oauth ----
  if (path === '/api/v1/me') {
    return json(res, 200, USERS[config.currentUser])
  }

  const feedFail = () => {
    if (config.failFeed) {
      json(res, 500, { error: 'mock feed failure' })
      return true
    }
    return false
  }

  if (path === '/hot' || path === '/new' || path === '/top') {
    stats.feedRequests++
    if (feedFail()) return
    const after = url.searchParams.get('after')
    if (after === 'cursor_page2') return json(res, 200, listing(HOME_PAGE2, null))
    return json(res, 200, listing(HOME_PAGE1, 'cursor_page2'))
  }

  const subMatch = path.match(/^\/r\/([^/]+)\/(hot|new|top)$/)
  if (subMatch) {
    stats.feedRequests++
    if (feedFail()) return
    const posts = SUBREDDIT_FEEDS[subMatch[1]] ?? []
    return json(res, 200, listing(posts, null))
  }

  if (path === '/subreddits/mine/subscriber') {
    return json(res, 200, { data: { children: SUBREDDITS } })
  }

  const commentsMatch = path.match(/^\/comments\/([^/]+)$/)
  if (commentsMatch) {
    const postId = commentsMatch[1]
    const post = [...HOME_PAGE1, ...HOME_PAGE2].find((p) => p.data.id === postId)
    if (!post) return json(res, 404, { error: 'post not found' })
    return json(res, 200, [
      { data: { children: [post] } },
      { data: { children: COMMENTS[postId] ?? [] } },
    ])
  }

  if (path === '/message/unread') {
    stats.unreadCalls++
    return json(res, 200, { data: { children: UNREAD_MESSAGES } })
  }

  // ---- DeepL ----
  if (path === '/v2/translate' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req))
    stats.deeplCalls++
    stats.deeplTexts += body.text.length
    stats.lastDeeplBody = body
    return json(res, 200, { translations: body.text.map((t) => ({ text: pseudoTranslate(t) })) })
  }

  // ---- Claude (Vision OCR) ----
  if (path === '/v1/messages' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req))
    stats.claudeCalls++
    const imageData = body.messages?.[0]?.content?.find((c) => c.type === 'image')?.source?.data
    const result =
      imageData === OCR_SIGN_BASE64
        ? {
            hasText: true,
            originalText: 'CAUTION Mice crossing ahead Please drive slowly',
            translatedText: '注意 ネズミ横断中 ゆっくり走行してください',
            textRegions: [
              { original: 'CAUTION', translated: '注意' },
              { original: 'Mice crossing ahead', translated: 'ネズミ横断中' },
              { original: 'Please drive slowly', translated: 'ゆっくり走行してください' },
            ],
          }
        : { hasText: false, originalText: '', translatedText: '', textRegions: [] }
    return json(res, 200, {
      id: 'msg_mock',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: JSON.stringify(result) }],
    })
  }

  json(res, 404, { error: `mock: unhandled ${req.method} ${path}` })
})

server.listen(MOCK_PORT, '127.0.0.1', () => {
  console.log(`[mock] external API mock listening on http://127.0.0.1:${MOCK_PORT}`)
})
