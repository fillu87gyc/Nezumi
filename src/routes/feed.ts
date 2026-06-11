import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { requireAuth } from '../middleware/auth'
import { kvCache } from '../middleware/cache'
import { refreshAccessToken } from './auth'
import { normalizePost, normalizeComments } from '../lib/reddit'
import { translateBatch } from '../lib/translate'
import { filterPosts } from '../lib/filter'
import { getUserFilterSettings } from '../lib/userSettings'
import { redditOauthBase } from '../lib/endpoints'

export const feed = new Hono<{ Bindings: Env; Variables: Variables }>()

feed.use('*', requireAuth)

feed.get('/home', kvCache({ ttl: 60 }), async (c) => {
  const { sort = 'hot', after, limit = '25', translate: doTranslate = 'true' } = c.req.query()
  const userId = c.get('userId')
  const token = await refreshAccessToken(userId, c.env)

  const params = new URLSearchParams({ sort, limit })
  if (after) params.set('after', after)

  const res = await fetch(`${redditOauthBase(c.env)}/${sort}?${params}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Nezumi/1.0' },
  })
  const json = await res.json() as { data: { children: unknown[]; after: string } }
  let posts = json.data.children.map((c) => normalizePost(c as Record<string, unknown>))

  const filterSettings = await getUserFilterSettings(userId, c.env)
  posts = filterPosts(posts, filterSettings)

  if (doTranslate !== 'false') {
    posts = await translateBatch(posts, c.env)
  }

  return c.json({ posts, after: json.data.after })
})

feed.get('/r/:subreddit', kvCache({ ttl: 120 }), async (c) => {
  const { subreddit } = c.req.param()
  const { sort = 'hot', after, limit = '25', translate: doTranslate = 'true' } = c.req.query()
  const userId = c.get('userId')
  const token = await refreshAccessToken(userId, c.env)

  const params = new URLSearchParams({ sort, limit })
  if (after) params.set('after', after)

  const res = await fetch(`${redditOauthBase(c.env)}/r/${subreddit}/${sort}?${params}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Nezumi/1.0' },
  })
  const json = await res.json() as { data: { children: unknown[]; after: string } }
  let posts = json.data.children.map((c) => normalizePost(c as Record<string, unknown>))

  const filterSettings = await getUserFilterSettings(userId, c.env)
  posts = filterPosts(posts, filterSettings)

  if (doTranslate !== 'false') {
    posts = await translateBatch(posts, c.env)
  }

  return c.json({ posts, after: json.data.after })
})

feed.get('/subreddits', kvCache({ ttl: 300 }), async (c) => {
  const userId = c.get('userId')
  const token = await refreshAccessToken(userId, c.env)

  const res = await fetch(`${redditOauthBase(c.env)}/subreddits/mine/subscriber?limit=100`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Nezumi/1.0' },
  })
  const json = await res.json() as { data: { children: unknown[] } }
  const subreddits = json.data.children.map((s: unknown) => {
    const sub = s as Record<string, unknown>
    const data = sub.data as Record<string, unknown>
    return {
      name: data.display_name as string,
      title: data.title as string,
      icon: (data.icon_img as string) || (data.community_icon as string) || '',
      subscribers: data.subscribers as number,
    }
  })

  return c.json({ subreddits })
})

feed.get('/post/:postId', async (c) => {
  const { postId } = c.req.param()
  const { sort = 'best' } = c.req.query()
  const userId = c.get('userId')
  const token = await refreshAccessToken(userId, c.env)

  const res = await fetch(`${redditOauthBase(c.env)}/comments/${postId}?sort=${sort}&depth=5`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Nezumi/1.0' },
  })
  const json = await res.json() as [
    { data: { children: unknown[] } },
    { data: { children: unknown[] } }
  ]
  const post = normalizePost(json[0].data.children[0] as Record<string, unknown>)
  const comments = normalizeComments(json[1].data.children)

  return c.json({ post, comments })
})
