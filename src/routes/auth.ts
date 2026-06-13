import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { setCookie, deleteCookie } from 'hono/cookie'
import type { Env } from '../types'
import { redditWwwBase, redditOauthBase } from '../lib/endpoints'

export const auth = new Hono<{ Bindings: Env }>()

function getBaseUrl(c: any): string {
  if (c.env.BASE_URL) return c.env.BASE_URL
  const host = c.req.header('host')
  const hostname = host?.split(':')[0] || 'localhost'
  return `https://${hostname}`
}

export async function refreshAccessToken(userId: string, env: Env): Promise<string> {
  const stored = await env.KV.get(`token:${userId}`)
  if (!stored) throw new Error('No token found')

  const tokenData = JSON.parse(stored)
  const now = Date.now() / 1000

  if (tokenData.expires_at > now + 60) {
    return tokenData.access_token
  }

  const response = await fetch(`${redditWwwBase(env)}/api/v1/access_token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Nezumi/1.0',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenData.refresh_token,
    }),
  })

  const newToken = await response.json() as { access_token: string; expires_in: number }
  const updated = {
    ...tokenData,
    access_token: newToken.access_token,
    expires_at: now + newToken.expires_in,
  }
  await env.KV.put(`token:${userId}`, JSON.stringify(updated), { expirationTtl: 60 * 60 * 24 * 30 })
  return newToken.access_token
}

auth.get('/login', async (c) => {
  const state = crypto.randomUUID()

  await c.env.KV.put(`oauth_state:${state}`, '1', { expirationTtl: 300 })

  const baseUrl = getBaseUrl(c)
  const redirectUri = `${baseUrl}/auth/callback`

  const params = new URLSearchParams({
    client_id: c.env.REDDIT_CLIENT_ID,
    response_type: 'code',
    state,
    redirect_uri: redirectUri,
    duration: 'permanent',
    scope: 'read identity mysubreddits subscribe vote submit privatemessages',
  })

  console.log(`[oauth:login] redirect_uri=${redirectUri}`)

  return c.redirect(`${redditWwwBase(c.env)}/api/v1/authorize.compact?${params}`)
})

auth.get('/callback', async (c) => {
  console.log(`[oauth:callback] raw URL: ${c.req.url}`)
  console.log(`[oauth:callback] host header: ${c.req.header('host')}`)

  const { code, state, error } = c.req.query()

  if (error) {
    console.log(`[oauth:callback] error=${error}`)
    return c.redirect(`/?error=${error}`)
  }

  const stateValid = await c.env.KV.get(`oauth_state:${state}`)
  if (!stateValid) {
    console.log(`[oauth:callback] state not found: ${state}`)
    return c.redirect('/?error=invalid_state')
  }
  await c.env.KV.delete(`oauth_state:${state}`)

  const baseUrl = getBaseUrl(c)
  const redirectUri = `${baseUrl}/auth/callback`
  console.log(`[oauth:callback] redirect_uri for token exchange=${redirectUri}`)

  const tokenResponse = await fetch(`${redditWwwBase(c.env)}/api/v1/access_token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${c.env.REDDIT_CLIENT_ID}:${c.env.REDDIT_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Nezumi/1.0',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  const tokenData = await tokenResponse.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
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
    JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: now + tokenData.expires_in,
    }),
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

  console.log(`[oauth:callback] user=${user.id} login successful`)
  return c.redirect('/')
})

auth.post('/logout', (c) => {
  deleteCookie(c, 'session', { path: '/' })
  deleteCookie(c, 'logged_in', { path: '/' })
  return c.json({ ok: true })
})
