# TICKET-020: OCR トークンバケット レート制限

| 項目 | 値 |
|---|---|
| フェーズ | Phase 6 |
| ブランチ | `feat/phase6-ocr-rate-limit` |
| 優先度 | P1 |
| 依存 | #11 |

---

## 背景・目的

Claude Vision API の月次コストを制御するため、トークンバケット方式のレート制限を実装する。  
月次クォータ（個人利用想定）と日次バーストキャップの 2 段階で管理する。

---

## スコープ

### In Scope
- `src/lib/rateLimiter.ts` — `TokenBucketRateLimiter` クラス
- `src/routes/image-translate.ts` への組み込み
- `GET /api/image-translate/quota` ステータスエンドポイントの完全実装

### Out of Scope
- Reddit API レート制限（別実装、#22 で対応）

---

## タスク

- [ ] `src/lib/rateLimiter.ts` を作成
  ```typescript
  export class TokenBucketRateLimiter {
    // monthlyQuota: 900, dailyBase: 30 (900/30), burstMax: 60 (30*2)
    async consume(kv: KVNamespace): Promise<ConsumeResult>
    async status(kv: KVNamespace): Promise<StatusResult>
  }
  ```
  - バケット状態を `ocr:bucket` キーで KV に保存
  - 月またぎ: `usedThisMonth` をリセット、トークンを `dailyBase` に戻す
  - 日またぎ: `dailyBase * daysElapsed` を補充し `burstMax` でキャップ
  - 月次クォータ枯渇: `{ allowed: false, reason: 'monthly_limit' }` を返す
  - 日次バースト枯渇: `{ allowed: false, reason: 'daily_burst_limit' }` を返す
  - 成功: `{ allowed: true, remaining, monthlyUsed, monthlyRemaining, resetAt }`
- [ ] `src/routes/image-translate.ts` の `POST /translate` に `ocrLimiter.consume()` を組み込む
  - `allowed: false` の場合 `429` レスポンスを返す（エラーメッセージは日本語）
  - `X-RateLimit-Remaining`, `X-RateLimit-Monthly-Remaining`, `X-RateLimit-Reset`, `Retry-After` ヘッダーを付与
- [ ] `GET /api/image-translate/quota` を完全実装（`ocrLimiter.status()` の結果を返す）
- [ ] `startOfDay()`, `startOfMonth()`, `nextMonth()` ユーティリティを実装

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | 初日に 30 回リクエストしてすべて通る | テスト |
| AC-2 | 31 回目のリクエストが `429 daily_burst_limit` を返す | テスト |
| AC-3 | 2 日分蓄積後に 60 回リクエストしてすべて通る | テスト |
| AC-4 | 61 回目のリクエストが `429 daily_burst_limit` を返す | テスト |
| AC-5 | `usedThisMonth` が 900 になると `429 monthly_limit` を返す | テスト |
| AC-6 | 月またぎ後に `usedThisMonth` が 0 にリセットされる | テスト |
| AC-7 | `GET /quota` が `{ tokens, burstMax, dailyBase, monthlyUsed, monthlyRemaining, ... }` を返す | ローカルテスト |
| AC-8 | 429 レスポンスに `Retry-After` ヘッダーが含まれる | テスト |
| AC-9 | `tsc --noEmit` がエラーなく通る | CI |

---

## エラーメッセージ仕様

| reason | HTTP | message |
|---|---|---|
| `daily_burst_limit` | 429 | 「本日のOCR上限（60枚）に達しました。リセット: {時刻}」 |
| `monthly_limit` | 429 | 「月次OCR上限（900枚）に達しました。リセット: {日付}」 |

---

## バケット設計まとめ

| シナリオ | 結果 |
|---|---|
| 初日に 30 枚 | OK、残 0 |
| 2 日使わず 3 日目に 60 枚 | OK、バースト上限でキャップ |
| 3 日溜めても 61 枚目 | NG `daily_burst_limit` |
| 月計 901 枚目 | NG `monthly_limit` |
| 月またぎ | `usedThisMonth` リセット |
