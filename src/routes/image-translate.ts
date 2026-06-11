import { Hono } from 'hono'
import type { Env, Variables, ImageTranslateResult } from '../types'
import { requireAuth } from '../middleware/auth'
import { claudeApiBase } from '../lib/endpoints'
import { ocrLimiter } from '../lib/rateLimiter'

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

  // レート制限チェック（キャッシュミス時のみ消費）
  const quota = await ocrLimiter.consume(c.env.KV)
  if (!quota.allowed) {
    const resetAt = quota.resetAt ?? 0
    const retryAfter = Math.max(0, resetAt - Math.floor(Date.now() / 1000))
    const message =
      quota.reason === 'monthly_limit'
        ? `月次 OCR クォータに達しました。リセット: ${new Date(resetAt * 1000).toLocaleDateString('ja-JP')}`
        : `本日の OCR 上限に達しました。${retryAfter} 秒後に再試行してください。`

    return c.json(
      { error: message, reason: quota.reason },
      429,
      {
        'X-RateLimit-Remaining': String(quota.remaining ?? 0),
        'X-RateLimit-Monthly-Remaining': String(quota.monthlyRemaining ?? 0),
        'X-RateLimit-Reset': String(resetAt),
        'Retry-After': String(retryAfter),
      }
    )
  }

  const imgResponse = await fetch(imageUrl)
  if (!imgResponse.ok) {
    return c.json({ error: 'Image fetch failed' }, 400)
  }

  const buffer = await imgResponse.arrayBuffer()
  const base64 = arrayBufferToBase64(buffer)
  const mediaType = imgResponse.headers.get('content-type') || 'image/jpeg'

  const prompt = `この画像に含まれるテキストをすべて抽出し、日本語に翻訳してください。\n\n出力形式（JSON）:\n{\n  "hasText": true/false,\n  "originalText": "抽出した原文",\n  "translatedText": "日本語翻訳",\n  "textRegions": [\n    { "original": "テキスト1", "translated": "翻訳1" }\n  ]\n}\n\nテキストがない場合は hasText: false で返してください。JSONのみ返してください。`

  const claudeRes = await fetch(`${claudeApiBase(c.env)}/v1/messages`, {
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
  return c.json(result, 200, {
    'X-RateLimit-Remaining': String(quota.remaining ?? 0),
    'X-RateLimit-Monthly-Remaining': String(quota.monthlyRemaining ?? 0),
    'X-RateLimit-Reset': String(quota.resetAt ?? 0),
  })
})

imageTranslate.get('/quota', async (c) => {
  const s = await ocrLimiter.status(c.env.KV)
  return c.json(s)
})

// 開発環境専用: E2E テスト用にバケットをリセット
imageTranslate.post('/__test_exhaust', async (c) => {
  if (c.env.ENVIRONMENT !== 'development') {
    return c.json({ error: 'Not found' }, 404)
  }
  await ocrLimiter.forceExhaust(c.env.KV)
  return c.json({ ok: true })
})

imageTranslate.post('/__test_reset', async (c) => {
  if (c.env.ENVIRONMENT !== 'development') {
    return c.json({ error: 'Not found' }, 404)
  }
  await ocrLimiter.reset(c.env.KV)
  return c.json({ ok: true })
})
