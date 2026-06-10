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
      // エラーレスポンス（4xx/5xx）はキャッシュしない
      if (c.res.ok) {
        const body = await c.res.clone().text()
        await c.env.KV.put(key, body, { expirationTtl: ttl })
      }
      // next() 後は c.header() ではレスポンスに反映されないため c.res.headers を直接操作する
      c.res.headers.set('X-Cache', 'MISS')
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
| AC-4 | ttl 経過後にキャッシュが無効化され、再度 MISS になる | ローカルテスト（ttl=60s。**KV の `expirationTtl` 最小値は 60 秒**のためそれ未満では検証できない） |
| AC-5 | POST エンドポイント（認証コールバックなど）にキャッシュが適用されていない | コードレビュー |
| AC-6 | エラーレスポンス（Reddit API 障害時の 5xx 等）がキャッシュされない | ユニットテスト |

---

## 備考

- KV の無料枠は reads 100,000/日・**writes 1,000/日**。単独利用のアクセス頻度なら両方とも余裕がある
- キャッシュキーにユーザー ID を含めない（**本アプリは Cloudflare Access 配下の単独利用が前提**。
  複数人で使う構成に変える場合は `/home` と `/subreddits` がユーザー固有データのため、キーに userId を含める必要がある）
- `after` パラメータが URL に含まれるため、ページネーション単位でキャッシュされる
- `expirationTtl` は 60 秒未満を指定できない（指定するとエラー）。全エンドポイントの ttl は 60 以上とする
