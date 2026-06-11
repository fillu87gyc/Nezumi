import { Hono } from 'hono'
import type { Env, Variables, ImageTranslateResult } from '../types'
import { requireAuth } from '../middleware/auth'

export const imageTranslate = new Hono<{ Bindings: Env; Variables: Variables }>()

imageTranslate.use('*', requireAuth)

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

imageTranslate.post('/translate', async (c) => {
  const { imageUrl, postId } = await c.req.json<{ imageUrl: string; postId: string }>()

  const cacheKey = `img-trans:${postId}`
  const cached = await c.env.KV.get(cacheKey)
  if (cached) {
    return c.json(JSON.parse(cached))
  }

  const imgResponse = await fetch(imageUrl)
  if (!imgResponse.ok) {
    return c.json({ error: 'Image fetch failed' }, 400)
  }

  const buffer = await imgResponse.arrayBuffer()
  const base64 = arrayBufferToBase64(buffer)
  const mediaType = imgResponse.headers.get('content-type') || 'image/jpeg'

  const prompt = `この画像に含まれるテキストをすべて抽出し、日本語に翻訳してください。

出力形式（JSON）:
{
  "hasText": true/false,
  "originalText": "抽出した原文",
  "translatedText": "日本語翻訳",
  "textRegions": [
    { "original": "テキスト1", "translated": "翻訳1" }
  ]
}

テキストがない場合は hasText: false で返してください。JSONのみ返してください。`

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': c.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  })

  const claudeData = await claudeRes.json() as { content: { type: string; text: string }[] }
  const rawText = claudeData.content?.[0]?.text || ''

  let result: ImageTranslateResult
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    result = JSON.parse(jsonMatch?.[0] || '{}')
    if (typeof result.hasText !== 'boolean') {
      result = { hasText: false, originalText: '', translatedText: '', textRegions: [] }
    }
  } catch {
    result = { hasText: false, originalText: '', translatedText: '', textRegions: [] }
  }

  await c.env.KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 60 * 60 * 24 * 7 })
  return c.json(result)
})

imageTranslate.get('/quota', (c) => {
  return c.json({ status: 'ok' })
})
