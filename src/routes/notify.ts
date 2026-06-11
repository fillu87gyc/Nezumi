import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { requireAuth } from '../middleware/auth'
import { refreshAccessToken } from './auth'

export const notify = new Hono<{ Bindings: Env; Variables: Variables }>()

notify.use('*', requireAuth)

notify.post('/subscribe', async (c) => {
  const userId = c.get('userId')
  const subscription = await c.req.json()
  await c.env.KV.put(`push-sub:${userId}`, JSON.stringify(subscription), {
    expirationTtl: 60 * 60 * 24 * 90,
  })
  return c.json({ ok: true })
})

notify.get('/unread', async (c) => {
  const userId = c.get('userId')
  const token = await refreshAccessToken(userId, c.env)

  const res = await fetch('https://oauth.reddit.com/message/unread', {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Nezumi/1.0' },
  })
  const json = await res.json() as { data: { children: unknown[] } }
  const messages = json.data.children.map((m: unknown) => {
    const msg = m as Record<string, unknown>
    const data = msg.data as Record<string, unknown>
    return {
      id: data.id as string,
      subject: data.subject as string,
      author: data.author as string,
      body: data.body as string,
      createdAt: data.created_utc as number,
      type: data.type as string,
    }
  })

  return c.json({ messages, count: messages.length })
})

export async function sendPushNotifications(env: Env): Promise<void> {
  let users: { id: string }[] = []
  try {
    const result = await env.DB.prepare('SELECT id FROM users').all()
    users = result.results as { id: string }[]
  } catch {
    return
  }

  await Promise.all(
    users.map(async (user) => {
      try {
        const subData = await env.KV.get(`push-sub:${user.id}`)
        if (!subData) return

        const token = await refreshAccessToken(user.id, env)
        const res = await fetch('https://oauth.reddit.com/message/unread', {
          headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Nezumi/1.0' },
        })
        const json = await res.json() as { data: { children: unknown[] } }

        if (json.data.children.length > 0) {
          // TODO: implement VAPID web push
          // await sendWebPush(JSON.parse(subData), { title: 'Nezumi', body: `${json.data.children.length}件の未読通知` }, env)
        }
      } catch {
        // individual user failures should not affect others
      }
    })
  )
}
