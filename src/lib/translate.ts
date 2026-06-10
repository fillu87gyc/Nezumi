import type { Post, Env } from '../types'
import { hashText } from '../routes/translate'

export async function translateBatch(posts: Post[], env: Env): Promise<Post[]> {
  if (posts.length === 0) return posts

  const results: Record<string, { title: string; selftext?: string }> = {}
  const uncached: { id: string; title: string; selftext?: string; titleKey: string; selftextKey?: string }[] = []

  await Promise.all(
    posts.map(async (post) => {
      const titleKey = `trans:${await hashText(post.title)}:JA`
      const cachedTitle = await env.KV.get(titleKey)
      let selftextKey: string | undefined
      let cachedSelftext: string | undefined

      if (post.selftext) {
        selftextKey = `trans:${await hashText(post.selftext)}:JA`
        cachedSelftext = await env.KV.get(selftextKey) ?? undefined
      }

      if (cachedTitle && (!post.selftext || cachedSelftext)) {
        results[post.id] = {
          title: cachedTitle,
          ...(cachedSelftext ? { selftext: cachedSelftext } : {}),
        }
      } else {
        uncached.push({ id: post.id, title: post.title, selftext: post.selftext || undefined, titleKey, selftextKey })
      }
    })
  )

  if (uncached.length > 0) {
    const textList: string[] = []
    uncached.forEach((item) => {
      textList.push(item.title)
      if (item.selftext) textList.push(item.selftext)
    })

    const chunks: string[][] = []
    for (let i = 0; i < textList.length; i += 50) {
      chunks.push(textList.slice(i, i + 50))
    }

    const allTranslations: string[] = []
    for (const chunk of chunks) {
      const res = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${env.DEEPL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: chunk, target_lang: 'JA' }),
      })
      const data = await res.json() as { translations: { text: string }[] }
      allTranslations.push(...data.translations.map((t) => t.text))
    }

    let idx = 0
    for (const item of uncached) {
      const translatedTitle = allTranslations[idx++]
      let translatedSelftext: string | undefined
      if (item.selftext) {
        translatedSelftext = allTranslations[idx++]
      }

      await env.KV.put(item.titleKey, translatedTitle, { expirationTtl: 60 * 60 * 24 * 7 })
      if (item.selftextKey && translatedSelftext) {
        await env.KV.put(item.selftextKey, translatedSelftext, { expirationTtl: 60 * 60 * 24 * 7 })
      }

      results[item.id] = {
        title: translatedTitle,
        ...(translatedSelftext ? { selftext: translatedSelftext } : {}),
      }
    }
  }

  return posts.map((post) => ({
    ...post,
    titleJa: results[post.id]?.title,
    selftextJa: results[post.id]?.selftext,
  }))
}
