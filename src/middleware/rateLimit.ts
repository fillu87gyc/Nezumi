// Reddit API レート制限ミドルウェア (#22)
// Reddit は OAuth2 エンドポイントに対して 100 req/分/ユーザーの制限を設ける。
// 安全マージンを取り 90 req/分 で KV スライディングウィンドウを実装する。

import { createMiddleware } from 'hono/factory'
import type { Env, Variables } from '../types'

const WINDOW_SEC = 60
const MAX_REQUESTS = 90

export const redditRateLimit = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const userId = c.get('userId')
    if (!userId) return next()

    const key = `rl:reddit:${userId}`
    const now = Math.floor(Date.now() / 1000)
    const windowStart = now - WINDOW_SEC

    const raw = await c.env.KV.get(key)
    const timestamps: number[] = raw ? JSON.parse(raw) : []

    // スライディングウィンドウ内のリクエストのみ残す
    const recent = timestamps.filter((t) => t > windowStart)

    if (recent.length >= MAX_REQUESTS) {
      const oldest = recent[0]
      const retryAfter = oldest + WINDOW_SEC - now
      return c.json(
        { error: 'Too Many Requests' },
        429,
        { 'Retry-After': String(Math.max(1, retryAfter)) }
      )
    }

    recent.push(now)
    await c.env.KV.put(key, JSON.stringify(recent), { expirationTtl: WINDOW_SEC + 5 })

    await next()
  }
)
