import { createMiddleware } from 'hono/factory'
import type { Env } from '../types'

export const kvCache = ({ ttl }: { ttl: number }) =>
  createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const key = `cache:${c.req.url}`
    const cached = await c.env.KV.get(key)
    if (cached) {
      return c.json(JSON.parse(cached), 200, { 'X-Cache': 'HIT' })
    }
    await next()
    if (c.res.ok) {
      const body = await c.res.clone().json()
      await c.env.KV.put(key, JSON.stringify(body), { expirationTtl: ttl })
      c.header('X-Cache', 'MISS')
    }
  })
