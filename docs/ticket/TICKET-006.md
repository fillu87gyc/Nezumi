# TICKET-006: KV キャッシュミドルウェア

| 項目 | 値 |
|---|---|
| フェーズ | Phase 1 |
| ブランチ | `feat/phase1-kv-cache` |
| 優先度 | P1 |
| 依存 | #5 |

---

## 背景・目的

Reddit API のレート制限（100 req/分）を回避し、フィードの応答速度を向上させる。  
`cache:{URL}` キーで KV に JSON レスポンスをキャッシュするミドルウェアを実装する。

---

## スコープ

### In Scope
- `src/middleware/cache.ts` — `kvCache({ ttl })` ファクトリ関数
- フィードエンドポイントへの適用（home: 60s, r/:subreddit: 120s, subreddits: 300s）

### Out of Scope
- 翻訳キャッシュ（→ #8 で DeepL キャッシュとして別実装）
- 画像翻訳キャッシュ（→ #11）

---

## タスク

- [ ] `src/middleware/cache.ts` を作成
  ```typescript
  export const kvCache = ({ ttl }: { ttl: number }) =>
    createMiddleware<{ Bindings: Env }>(async (c, next) => {
      const key = `cache:${c.req.url}`
      const cached = await c.env.KV.get(key)
      if (cached) {
        return c.json(JSON.parse(cached), 200, { 'X-Cache': 'HIT' })
      }
      await next()
      const body = await c.res.clone().json()
      await c.env.KV.put(key, JSON.stringify(body), { expirationTtl: ttl })
      c.header('X-Cache', 'MISS')
    })
  ```
- [ ] `src/routes/feed.ts` の各エンドポイントに `kvCache` を適用
  - `/home`: ttl=60
  - `/r/:subreddit`: ttl=120
  - `/subreddits`: ttl=300

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | 初回リクエストで `X-Cache: MISS` ヘッダーが返る | curl |
| AC-2 | 2 回目の同 URL リクエストで `X-Cache: HIT` ヘッダーが返る | curl |
| AC-3 | キャッシュヒット時の応答が初回と同一 JSON である | テスト |
| AC-4 | ttl 経過後にキャッシュが無効化され、再度 MISS になる | ローカルテスト（ttl=5s で確認） |
| AC-5 | POST エンドポイント（認証コールバックなど）にキャッシュが適用されていない | コードレビュー |

---

## 備考

- KV の無料枠は 100,000 reads/日。フィードキャッシュのみで十分余裕がある
- キャッシュキーにユーザー ID を含めない（フィードはユーザー単位でなく URL 単位でキャッシュ）
- `after` パラメータが URL に含まれるため、ページネーション単位でキャッシュされる
