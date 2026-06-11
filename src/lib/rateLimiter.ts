// OCR トークンバケット レート制限 (#20)
// 月次クォータ 900 回・日次ベース 30 回・バーストキャップ 60 回

export interface ConsumeResult {
  allowed: boolean
  reason?: 'daily_burst_limit' | 'monthly_limit'
  remaining?: number
  monthlyUsed?: number
  monthlyRemaining?: number
  resetAt?: number
}

export interface StatusResult {
  tokens: number
  dailyBase: number
  burstMax: number
  monthlyQuota: number
  usedThisMonth: number
  monthlyRemaining: number
  resetAt: number
}

interface BucketState {
  tokens: number
  lastReplenishDay: string // 'YYYY-MM-DD'
  monthKey: string         // 'YYYY-MM'
  usedThisMonth: number
}

const KV_KEY = 'ocr:bucket'

export function startOfDay(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function startOfMonth(now = new Date()): string {
  return now.toISOString().slice(0, 7)
}

export function nextMonthTimestamp(now = new Date()): number {
  return Math.floor(new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() / 1000)
}

function nextDayTimestamp(now = new Date()): number {
  return Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() / 1000)
}

function daysDiff(from: string, to: string): number {
  const diff = new Date(to).getTime() - new Date(from).getTime()
  return Math.max(0, Math.floor(diff / 86_400_000))
}

export class TokenBucketRateLimiter {
  readonly monthlyQuota: number
  readonly dailyBase: number
  readonly burstMax: number

  constructor(dailyBase = 30, monthlyQuota = 900) {
    this.dailyBase = dailyBase
    this.burstMax = dailyBase * 2
    this.monthlyQuota = monthlyQuota
  }

  private async load(kv: KVNamespace): Promise<BucketState> {
    const raw = await kv.get(KV_KEY)
    if (!raw) {
      return {
        tokens: this.dailyBase,
        lastReplenishDay: startOfDay(),
        monthKey: startOfMonth(),
        usedThisMonth: 0,
      }
    }
    return JSON.parse(raw) as BucketState
  }

  private replenish(state: BucketState, now = new Date()): BucketState {
    const today = startOfDay(now)
    const currentMonth = startOfMonth(now)

    if (state.monthKey !== currentMonth) {
      return {
        tokens: this.dailyBase,
        lastReplenishDay: today,
        monthKey: currentMonth,
        usedThisMonth: 0,
      }
    }

    if (state.lastReplenishDay !== today) {
      const days = daysDiff(state.lastReplenishDay, today)
      const newTokens = Math.min(state.tokens + this.dailyBase * days, this.burstMax)
      return { ...state, tokens: newTokens, lastReplenishDay: today }
    }

    return state
  }

  async consume(kv: KVNamespace): Promise<ConsumeResult> {
    const now = new Date()
    const raw = await this.load(kv)
    const state = this.replenish(raw, now)

    if (state.usedThisMonth >= this.monthlyQuota) {
      await kv.put(KV_KEY, JSON.stringify(state))
      return {
        allowed: false,
        reason: 'monthly_limit',
        remaining: state.tokens,
        monthlyUsed: state.usedThisMonth,
        monthlyRemaining: 0,
        resetAt: nextMonthTimestamp(now),
      }
    }

    if (state.tokens <= 0) {
      await kv.put(KV_KEY, JSON.stringify(state))
      return {
        allowed: false,
        reason: 'daily_burst_limit',
        remaining: 0,
        monthlyUsed: state.usedThisMonth,
        monthlyRemaining: this.monthlyQuota - state.usedThisMonth,
        resetAt: nextDayTimestamp(now),
      }
    }

    state.tokens -= 1
    state.usedThisMonth += 1
    await kv.put(KV_KEY, JSON.stringify(state))

    return {
      allowed: true,
      remaining: state.tokens,
      monthlyUsed: state.usedThisMonth,
      monthlyRemaining: this.monthlyQuota - state.usedThisMonth,
      resetAt: nextDayTimestamp(now),
    }
  }

  async status(kv: KVNamespace): Promise<StatusResult> {
    const now = new Date()
    const raw = await this.load(kv)
    const state = this.replenish(raw, now)
    return {
      tokens: state.tokens,
      dailyBase: this.dailyBase,
      burstMax: this.burstMax,
      monthlyQuota: this.monthlyQuota,
      usedThisMonth: state.usedThisMonth,
      monthlyRemaining: this.monthlyQuota - state.usedThisMonth,
      resetAt: nextDayTimestamp(now),
    }
  }

  async forceExhaust(kv: KVNamespace): Promise<void> {
    const now = new Date()
    const state: BucketState = {
      tokens: 0,
      lastReplenishDay: startOfDay(now),
      monthKey: startOfMonth(now),
      usedThisMonth: 0,
    }
    await kv.put(KV_KEY, JSON.stringify(state))
  }

  async reset(kv: KVNamespace): Promise<void> {
    await kv.delete(KV_KEY)
  }
}

export const ocrLimiter = new TokenBucketRateLimiter()
