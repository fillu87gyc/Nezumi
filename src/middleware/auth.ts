import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import { getCookie } from 'hono/cookie'
import type { Env, Variables } from '../types'

export const requireAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const token = getCookie(c, 'session')
    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    try {
      const payload = await verify(token, c.env.JWT_SECRET)
      c.set('userId', payload.sub as string)
      c.set('userName', payload.name as string)
      await next()
    } catch {
      return c.json({ error: 'Invalid token' }, 401)
    }
  }
)
