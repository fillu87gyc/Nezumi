import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { requireAuth } from '../middleware/auth'

export const settings = new Hono<{ Bindings: Env; Variables: Variables }>()

settings.use('*', requireAuth)

settings.get('/', async (c) => {
  const userId = c.get('userId')

  const [ngResult, userResult] = await Promise.all([
    c.env.DB.prepare(
      'SELECT id, word, match_type, target FROM ng_words WHERE user_id = ? ORDER BY id'
    ).bind(userId).all(),
    c.env.DB.prepare('SELECT settings FROM users WHERE id = ?').bind(userId).first<{ settings: string }>(),
  ])

  const s = userResult?.settings ? JSON.parse(userResult.settings) : {}
  const filter = {
    minScore: s.minScore ?? 0,
    minComments: s.minComments ?? 0,
    filterNsfw: s.filterNsfw ?? false,
  }

  const ngWords = (ngResult.results as { id: number; word: string; match_type: string; target: string }[]).map(
    (r) => ({ id: r.id, word: r.word, matchType: r.match_type, target: r.target })
  )

  return c.json({ filter, ngWords })
})

settings.patch('/filter', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ minScore?: number; minComments?: number; filterNsfw?: boolean }>()

  const userResult = await c.env.DB.prepare('SELECT settings FROM users WHERE id = ?')
    .bind(userId)
    .first<{ settings: string }>()

  const current = userResult?.settings ? JSON.parse(userResult.settings) : {}
  if (body.minScore !== undefined) current.minScore = body.minScore
  if (body.minComments !== undefined) current.minComments = body.minComments
  if (body.filterNsfw !== undefined) current.filterNsfw = body.filterNsfw

  await c.env.DB.prepare('UPDATE users SET settings = ? WHERE id = ?')
    .bind(JSON.stringify(current), userId)
    .run()

  return c.json({
    minScore: current.minScore ?? 0,
    minComments: current.minComments ?? 0,
    filterNsfw: current.filterNsfw ?? false,
  })
})

settings.post('/ng-words', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ word: string; matchType?: string; target?: string }>()

  const word = body.word?.trim()
  if (!word) return c.json({ error: 'word is required' }, 400)

  const matchType = body.matchType ?? 'contains'
  const target = body.target ?? 'all'

  const result = await c.env.DB.prepare(
    'INSERT INTO ng_words (user_id, word, match_type, target) VALUES (?, ?, ?, ?)'
  ).bind(userId, word, matchType, target).run()

  return c.json({ id: result.meta.last_row_id, word, matchType, target }, 201)
})

settings.delete('/ng-words/:id', async (c) => {
  const userId = c.get('userId')
  const id = Number(c.req.param('id'))
  if (!id) return c.json({ error: 'invalid id' }, 400)

  await c.env.DB.prepare('DELETE FROM ng_words WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .run()

  return new Response(null, { status: 204 })
})
