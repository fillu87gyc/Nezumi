import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { setCookie, deleteCookie } from 'hono/cookie'
import type { Env } from '../types'
import { redditWwwBase, redditOauthBase } from '../lib/endpoints'

export const auth = new Hono<{ Bindings: Env }>()

async function passwordGrant(env: Env): Promise<{ access_token: string; expires_in: number; error?: string }> {
  const res = await fetch(`${redditWwwBase(env)}/api/v1/access_token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Nezumi/1.0',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username: env.REDDIT_USERNAME,
      password: env.REDDIT_PASSWORD,
      scope: 'read identity mysubreddits subscribe vote submit privatemessages',
    }),
  })
  return res.json()
}

export async function refreshAccessToken(userId: string, env: Env): Promise<string> {
  const stored = await env.KV.get(`token:${userId}`)
  if (!stored) throw new Error('No token found')

  const tokenData = JSON.parse(stored)
  const now = Date.now() / 1000

  if (tokenData.expires_at > now + 60) {
    return tokenData.access_token
  }

  // script app は refresh_token を返さないため、再度 password grant で取得する
  const newToken = await passwordGrant(env)
  const updated = { access_token: newToken.access_token, expires_at: now + newToken.expires_in }
  await env.KV.put(`token:${userId}`, JSON.stringify(updated), { expirationTtl: 60 * 60 * 24 * 30 })
  return newToken.access_token
}

auth.get('/login', async (c) => {
  const tokenData = await passwordGrant(c.env)

  if (tokenData.error) {
    console.log(`[auth:login] reddit error=${tokenData.error}`)
    return c.redirect(`/?error=${tokenData.error}`)
  }

  const userResponse = await fetch(`${redditOauthBase(c.env)}/api/v1/me`, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'Nezumi/1.0',
    },
  })
  const user = await userResponse.json() as { id: string; name: string }

  const now = Date.now() / 1000
  await c.env.KV.put(
    `token:${user.id}`,
    JSON.stringify({ access_token: tokenData.access_token, expires_at: now + tokenData.expires_in }),
    { expirationTtl: 60 * 60 * 24 * 30 }
  )

  await c.env.DB.prepare(
    'INSERT INTO users (id, name, created_at) VALUES (?, ?, unixepoch()) ON CONFLICT(id) DO UPDATE SET name = excluded.name'
  )
    .bind(user.id, user.name)
    .run()

  const jwt = await sign(
    { sub: user.id, name: user.name, exp: Math.floor(now + 60 * 60 * 24 * 30) },
    c.env.JWT_SECRET
  )

  setCookie(c, 'session', jwt, {
    httpOnly: true,
    secure: c.env.ENVIRONMENT !== 'development',
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })

  // session は httpOnly で JS から見えないため、ログイン状態の表示判定用に
  // 非 httpOnly のコンパニオン Cookie を併設する（認可には使わない）
  setCookie(c, 'logged_in', '1', {
    httpOnly: false,
    secure: c.env.ENVIRONMENT !== 'development',
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })

  console.log(`[auth:login] user=${user.id} login successful`)
  return c.redirect('/')
})

auth.post('/logout', (c) => {
  deleteCookie(c, 'session', { path: '/' })
  deleteCookie(c, 'logged_in', { path: '/' })
  return c.json({ ok: true })
})
