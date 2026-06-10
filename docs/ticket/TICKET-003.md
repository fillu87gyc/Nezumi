# TICKET-003: OAuth2 PKCE フロー実装（Workers）

| 項目 | 値 |
|---|---|
| フェーズ | Phase 1 |
| ブランチ | `feat/phase1-oauth2-pkce` |
| 優先度 | P0 |
| 依存 | #2 |

---

## 背景・目的

Reddit API を利用するためのユーザー認証基盤を構築する。  
Workers 側でシークレットを管理し、クライアントには一切露出させない PKCE フローを実装する。

---

## スコープ

### In Scope
- `GET /auth/login` — PKCE state/verifier 生成・KV 保存・Reddit 認可 URL へリダイレクト
- `GET /auth/callback` — code 交換・アクセストークン取得・KV 保存・JWT 発行・セッション Cookie 設定
- `POST /auth/logout` — セッション Cookie 削除
- `refreshAccessToken()` — トークン有効期限チェック + リフレッシュ（内部ユーティリティ）
- PKCE ユーティリティ（`generateCodeVerifier` / `generateCodeChallenge`）

### Out of Scope
- 認証ミドルウェア（→ #4）
- フロントエンドのログイン画面（→ #7）

---

## タスク

- [ ] `src/routes/auth.ts` を作成
  - `GET /auth/login` — state を `crypto.randomUUID()` で生成、code_verifier を 32 バイトランダムから生成、KV に `oauth_state:{state}` キーで 5 分 TTL 保存
  - `GET /auth/callback` — state 検証 → KV から verifier 取得・削除 → Reddit トークンエンドポイントへ POST → ユーザー情報取得 → KV に `token:{userId}` 保存（30 日 TTL）→ JWT 発行 → `session` Cookie に httpOnly/secure/SameSite=Lax で設定
  - `POST /auth/logout` — `session` Cookie を削除
- [ ] `refreshAccessToken(userId, env)` をエクスポート関数として実装（有効期限 1 分前でリフレッシュ）
- [ ] PKCE ヘルパーを同ファイルに実装（`generateCodeVerifier`, `generateCodeChallenge`）
- [ ] `src/index.ts` に `app.route('/auth', auth)` を追加

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | `GET /auth/login` が Reddit 認可 URL（`https://www.reddit.com/api/v1/authorize?...`）へリダイレクトする | ローカル `curl -L` |
| AC-2 | callback 後に `session` Cookie が設定され、httpOnly・secure・SameSite=Lax 属性を持つ | ブラウザ DevTools / curl |
| AC-3 | 不正な `state` パラメータで callback にアクセスすると `/?error=invalid_state` にリダイレクトする | ユニットテスト |
| AC-4 | `refreshAccessToken` はトークンが有効な場合 Reddit API を呼ばず KV の値をそのまま返す | ユニットテスト |
| AC-5 | `refreshAccessToken` は期限切れのトークンを自動更新し KV に保存する | ユニットテスト |
| AC-6 | `POST /auth/logout` で `session` Cookie が削除される | curl |
| AC-7 | `tsc --noEmit` がエラーなく通る | CI |

---

## セキュリティ要件

- code_verifier は KV に一時保存し、callback 処理後に即削除する
- Reddit client_secret はシークレット（`c.env.REDDIT_CLIENT_SECRET`）経由のみで参照する
- JWT の署名に使う `JWT_SECRET` は最低 32 バイトのランダム文字列とする
- トークンを KV に保存する際、refresh_token は平文可（KV 自体がサーバーサイドストレージのため）

---

## 参考

- Reddit OAuth2: `https://www.reddit.com/dev/api/oauth`
- Hono JWT: `hono/jwt`
- Hono Cookie: `hono/cookie`
