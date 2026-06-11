import { describe, it, expect, beforeEach } from 'vitest'
import { TokenBucketRateLimiter, startOfDay, startOfMonth, nextMonthTimestamp } from './rateLimiter'

// KVNamespace のインメモリスタブ
function makeKV() {
  const store = new Map<string, string>()
  return {
    async get(key: string) { return store.get(key) ?? null },
    async put(key: string, value: string) { store.set(key, value) },
    async delete(key: string) { store.delete(key) },
  } as unknown as KVNamespace
}

describe('TokenBucketRateLimiter', () => {
  let kv: KVNamespace
  let limiter: TokenBucketRateLimiter

  beforeEach(() => {
    kv = makeKV()
    // テスト用に dailyBase=3, monthlyQuota=10 で小さなバケット
    limiter = new TokenBucketRateLimiter(3, 10)
  })

  it('初期状態で dailyBase 分のリクエストが通る', async () => {
    for (let i = 0; i < 3; i++) {
      const r = await limiter.consume(kv)
      expect(r.allowed).toBe(true)
      expect(r.remaining).toBe(2 - i)
    }
  })

  it('dailyBase を超えると daily_burst_limit で 429', async () => {
    for (let i = 0; i < 3; i++) await limiter.consume(kv)
    const r = await limiter.consume(kv)
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('daily_burst_limit')
    expect(r.remaining).toBe(0)
    expect(r.resetAt).toBeDefined()
  })

  it('2 日後に dailyBase 分補充される（burstMax でキャップ）', async () => {
    // すべて消費
    for (let i = 0; i < 3; i++) await limiter.consume(kv)

    // 2 日後のタイムスタンプで consume を呼ぶ
    const future = new Date(Date.now() + 2 * 86_400_000)
    const futureDay = startOfDay(future)
    const kv2 = makeKV()
    // 空トークン状態を手動で書き込む
    await kv2.put('ocr:bucket', JSON.stringify({
      tokens: 0,
      lastReplenishDay: startOfDay(new Date(Date.now() - 2 * 86_400_000)),
      monthKey: startOfMonth(),
      usedThisMonth: 3,
    }))

    const limiter2 = new TokenBucketRateLimiter(3, 10)
    // replenish: 0 + 3*2=6 → burstMax=6 → 6 トークン
    const r = await limiter2.consume(kv2)
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(5) // 6 - 1
  })

  it('月次クォータを超えると monthly_limit で 429', async () => {
    // monthlyQuota=10 に達するまで消費
    for (let i = 0; i < 10; i++) {
      // KV に usedThisMonth=i+1 を直接書き込んでシミュレート
    }
    // usedThisMonth=10 を設定
    await kv.put('ocr:bucket', JSON.stringify({
      tokens: 3,
      lastReplenishDay: startOfDay(),
      monthKey: startOfMonth(),
      usedThisMonth: 10,
    }))

    const r = await limiter.consume(kv)
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('monthly_limit')
    expect(r.monthlyRemaining).toBe(0)
    expect(r.resetAt).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('月またぎでバケットがリセットされる', async () => {
    // 先月のバケット状態
    await kv.put('ocr:bucket', JSON.stringify({
      tokens: 0,
      lastReplenishDay: '2024-12-31',
      monthKey: '2024-12',
      usedThisMonth: 9,
    }))

    const r = await limiter.consume(kv)
    expect(r.allowed).toBe(true)
    expect(r.monthlyUsed).toBe(1) // リセット後の 1 件目
    expect(r.remaining).toBe(2)   // dailyBase(3) - 1
  })

  it('status() が正しいフィールドを返す', async () => {
    const s = await limiter.status(kv)
    expect(s.tokens).toBe(3)
    expect(s.dailyBase).toBe(3)
    expect(s.burstMax).toBe(6)
    expect(s.monthlyQuota).toBe(10)
    expect(s.usedThisMonth).toBe(0)
    expect(s.monthlyRemaining).toBe(10)
    expect(s.resetAt).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('forceExhaust() 後に consume() が 429 を返す', async () => {
    await limiter.forceExhaust(kv)
    const r = await limiter.consume(kv)
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('daily_burst_limit')
  })

  it('reset() 後にバケットが初期化される', async () => {
    for (let i = 0; i < 3; i++) await limiter.consume(kv)
    await limiter.reset(kv)
    const r = await limiter.consume(kv)
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(2)
  })
})

describe('ユーティリティ関数', () => {
  it('startOfDay は YYYY-MM-DD 形式を返す', () => {
    expect(startOfDay(new Date('2024-06-15T10:30:00Z'))).toBe('2024-06-15')
  })

  it('startOfMonth は YYYY-MM 形式を返す', () => {
    expect(startOfMonth(new Date('2024-06-15T10:30:00Z'))).toBe('2024-06')
  })

  it('nextMonthTimestamp は翌月初日のタイムスタンプを返す', () => {
    const ts = nextMonthTimestamp(new Date('2024-06-15T10:30:00Z'))
    expect(ts).toBe(Math.floor(new Date('2024-07-01').getTime() / 1000))
  })
})
