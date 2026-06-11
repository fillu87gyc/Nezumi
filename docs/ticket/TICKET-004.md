# TICKET-004: 認証ミドルウェア + JWT セッション管理

| 項目 | 値 |
|---|---|
| フェーズ | Phase 1 |
| ブランチ | `feat/phase1-auth-middleware` |
| 優先度 | P0 |
| 依存 | #3 |

---

## 背景・目的

保護されたエンドポイントに共通の認証チェックを設ける。  
`session` Cookie の JWT を検証し、`userId` / `userName` をコンテキストに注入する。  
あわせて、前段 Cloudflare Access の JWT（`Cf-Access-Jwt-Assertion`）を検証する深層防御ミドルウェアを実装する
（Access の設定ミスや経路バイパスがあっても Worker 単体で防御できるようにする）。

---

## スコープ

### In Scope
- `src/middleware/auth.ts` — `requireAuth` ミドルウェア
- `src/middleware/access.ts` — `verifyAccessJwt` ミドルウェア（Cloudflare Access JWT 検証）
- `src/types.ts` への `Variables` 型追加（`userId`, `userName`）
- `src/index.ts` での集中適用（`app.use('/api/*', verifyAccessJwt, requireAuth)`）

### Out of Scope
- Access 自体のポリシー設定（→ #2 の `docs/setup/ACCESS.md`）

---

## タスク

- [ ] `src/types.ts` に `Variables` インターフェースを追加
  ```typescript
  export interface Variables {
    userId: string
    userName: string
  }
  ```
- [ ] `src/middleware/auth.ts` に `requireAuth` を実装
  - `session` Cookie が存在しない場合 → `401 Unauthorized`
  - `verify(token, env.JWT_SECRET)` が失敗した場合 → `401 Invalid token`
  - 成功時 → `c.set('userId', payload.sub)` / `c.set('userName', payload.name)`
- [ ] `src/middleware/access.ts` に `verifyAccessJwt` を実装
  - `Cf-Access-Jwt-Assertion` ヘッダーの JWT を検証（`403` で拒否）
  - 公開鍵は `https://{env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs` から取得し KV に 24h キャッシュ
  - `aud` クレームが `env.ACCESS_AUD` と一致することを検証
  - `ENVIRONMENT === 'development'` のローカル実行時はスキップ可（Access が前段にいないため）
- [ ] `src/index.ts` に `app.use('/api/*', verifyAccessJwt, requireAuth)` と `app.use('/auth/*', verifyAccessJwt)` を追加
  （各ルートファイルで個別適用する方式は付け忘れ事故のもとなので採らない）
- [ ] `Hono` の型パラメータ `{ Bindings: Env; Variables: Variables }` をすべてのルートに適用する規約を `src/types.ts` コメントに記載

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | Cookie なしで保護エンドポイントにアクセスすると `401 {"error":"Unauthorized"}` が返る | ユニットテスト |
| AC-2 | 無効な JWT で `401 {"error":"Invalid token"}` が返る | ユニットテスト |
| AC-3 | 有効な JWT で `c.get('userId')` と `c.get('userName')` が正しい値を返す | ユニットテスト |
| AC-4 | `Cf-Access-Jwt-Assertion` ヘッダーなし（または不正）で `/api/*` にアクセスすると `403` が返る（production 設定時） | ユニットテスト |
| AC-5 | `/api/*` 配下の新規ルートが個別設定なしで認証保護される（index.ts の集中適用） | コードレビュー |
| AC-6 | `tsc --noEmit` がエラーなく通る | CI |

---

## 備考

- `hono/factory` の `createMiddleware` を使って型安全なミドルウェアとする
