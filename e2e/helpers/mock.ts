// モック外部 API サーバー（e2e/mock/server.mjs）の制御クライアント

const MOCK_BASE = 'http://127.0.0.1:9377'

export interface MockStats {
  tokenGrants: { authorization_code: number; refresh_token: number }
  feedRequests: number
  deeplCalls: number
  deeplTexts: number
  claudeCalls: number
  unreadCalls: number
  requests: string[]
  config: { currentUser: string; tokenExpiresIn: number; failFeed: boolean }
}

export async function mockConfig(patch: {
  currentUser?: 'alice' | 'bob'
  tokenExpiresIn?: number
  failFeed?: boolean
}): Promise<void> {
  const res = await fetch(`${MOCK_BASE}/__mock/config`, {
    method: 'POST',
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`mockConfig failed: ${res.status}`)
}

export async function mockStats(): Promise<MockStats> {
  const res = await fetch(`${MOCK_BASE}/__mock/stats`)
  return res.json() as Promise<MockStats>
}

export const MOCK_IMG = {
  ocrSign: `${MOCK_BASE}/img/ocr-sign.png`,
  plain: `${MOCK_BASE}/img/plain.png`,
}
