import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { requireAuth } from '../middleware/auth'
import { deeplApiBase } from '../lib/endpoints'

export const translate = new Hono<{ Bindings: Env; Variables: Variables }>()

translate.use('*', requireAuth)

export async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

async function translateTextWithDeepL(
  text: string,
  targetLang: string,
  env: Env
): Promise<string> {
  const cacheKey = `trans:${await hashText(text)}:${targetLang}`
  const cached = await env.KV.get(cacheKey)
  if (cached) return cached

  const res = await fetch(`${deeplApiBase(env)}/v2/translate`, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${env.DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: [text], target_lang: targetLang }),
  })
  const data = await res.json() as { translations: { text: string }[] }
  const translated = data.translations[0].text

  await env.KV.put(cacheKey, translated, { expirationTtl: 60 * 60 * 24 * 7 })
  return translated
}

translate.post('/text', async (c) => {
  const { text, sourceLang, targetLang = 'JA' } = await c.req.json<{
    text: string
    sourceLang?: string
    targetLang?: string
  }>()

  if (!text) {
    return c.json({ translated: '' })
  }

  const cacheKey = `trans:${await hashText(text)}:${targetLang}`
  const cached = await c.env.KV.get(cacheKey)
  if (cached) {
    return c.json({ translated: cached, cached: true })
  }

  const res = await fetch(`${deeplApiBase(c.env)}/v2/translate`, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${c.env.DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      target_lang: targetLang,
      ...(sourceLang ? { source_lang: sourceLang } : {}),
    }),
  })

  const data = await res.json() as { translations: { text: string }[] }
  const translated = data.translations[0].text

  await c.env.KV.put(cacheKey, translated, { expirationTtl: 60 * 60 * 24 * 7 })
  return c.json({ translated })
})

translate.post('/batch', async (c) => {
  const { texts, targetLang = 'JA' } = await c.req.json<{
    texts: { id: string; title: string; selftext?: string }[]
    targetLang?: string
  }>()

  const results: Record<string, { title: string; selftext?: string }> = {}

  const uncached: { id: string; title: string; selftext?: string; titleKey: string; selftextKey?: string }[] = []

  await Promise.all(
    texts.map(async (item) => {
      const titleKey = `trans:${await hashText(item.title)}:${targetLang}`
      const cachedTitle = await c.env.KV.get(titleKey)
      let selftextKey: string | undefined
      let cachedSelftext: string | undefined

      if (item.selftext) {
        selftextKey = `trans:${await hashText(item.selftext)}:${targetLang}`
        cachedSelftext = await c.env.KV.get(selftextKey) ?? undefined
      }

      if (cachedTitle && (!item.selftext || cachedSelftext)) {
        results[item.id] = {
          title: cachedTitle,
          ...(cachedSelftext ? { selftext: cachedSelftext } : {}),
        }
      } else {
        uncached.push({ ...item, titleKey, selftextKey })
      }
    })
  )

  const chunks = chunkArray(uncached, 50)
  for (const chunk of chunks) {
    const textList: string[] = []
    chunk.forEach((item) => {
      textList.push(item.title)
      if (item.selftext) textList.push(item.selftext)
    })

    const res = await fetch(`${deeplApiBase(c.env)}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${c.env.DEEPL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: textList, target_lang: targetLang }),
    })
    const data = await res.json() as { translations: { text: string }[] }
    const translations = data.translations

    let idx = 0
    for (const item of chunk) {
      const translatedTitle = translations[idx++].text
      let translatedSelftext: string | undefined
      if (item.selftext) {
        translatedSelftext = translations[idx++].text
      }

      await c.env.KV.put(item.titleKey, translatedTitle, { expirationTtl: 60 * 60 * 24 * 7 })
      if (item.selftextKey && translatedSelftext) {
        await c.env.KV.put(item.selftextKey, translatedSelftext, { expirationTtl: 60 * 60 * 24 * 7 })
      }

      results[item.id] = {
        title: translatedTitle,
        ...(translatedSelftext ? { selftext: translatedSelftext } : {}),
      }
    }
  }

  return c.json({ results })
})

export { translateTextWithDeepL }
