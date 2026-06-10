import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { setCookie, deleteCookie } from 'hono/cookie'
import type { Env } from '../types'

export const auth = new Hono<{ Bindings: Env }>()

function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function refreshAccessToken(userId: string, env: Env): Promise<string> {
  const stored = await env.KV.get(`token:${userId}`)
  if (!stored) throw new Error('No token found')

  const tokenData = JSON.parse(stored)
  const now = Date.now() / 1000

  if (tokenData.expires_at > now + 60) {
    return tokenData.access_token
  }

  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
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
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)

  await c.env.KV.put(`oauth_state:${state}`, verifier, { expirationTtl: 300 })

  const baseUrl = c.env.BASE_URL || 'http://localhost:8787'
  const params = new URLSearchParams({
    client_id: c.env.REDDIT_CLIENT_ID,
    response_type: 'code',
    state,
    redirect_uri: `${baseUrl}/auth/callback`,
    duration: 'permanent',
    scope: 'read identity mysubreddits subscribe vote submit privatemessages',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  return c.redirect(`https://www.reddit.com/api/v1/authorize?${params}`)
})

auth.get('/callback', async (c) => {
  const { code, state, error } = c.req.query()

  if (error) {
    return c.redirect(`/?error=${error}`)
  }

  const verifier = await c.env.KV.get(`oauth_state:${state}`)
  if (!verifier) {
    return c.redirect('/?error=invalid_state')
  }
  await c.env.KV.delete(`oauth_state:${state}`)

  const baseUrl = c.env.BASE_URL || 'http://localhost:8787'

  const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${c.env.REDDIT_CLIENT_ID}:${c.env.REDDIT_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Nezumi/1.0',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${baseUrl}/auth/callback`,
      code_verifier: verifier,
    }),
  })

  const tokenData = await tokenResponse.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  const userResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
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
    'INSERT OR REPLACE INTO users (id, name, created_at) VALUES (?, ?, unixepoch())'
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

  return c.redirect('/')
})

auth.post('/logout', (c) => {
  deleteCookie(c, 'session', { path: '/' })
  return c.json({ ok: true })
})
