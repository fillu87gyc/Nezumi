# TICKET-003: OAuth2 認可コードフロー実装（Workers）

| 項目 | 値 |
|---|---|
| フェーズ | Phase 1 |
| ブランチ | `feat/phase1-oauth2` |
| 優先度 | P0 |
| 依存 | #2 |

---

## 背景・目的

Reddit API を利用するためのユーザー認証基盤を構築する。  
Workers 側でシークレットを管理し、クライアントには一切露出させない認可コードフローを実装する。

> **注意**: Reddit OAuth2 は PKCE（code_challenge）を**サポートしていない**。
> 本実装は client_secret をサーバーサイドに持つ confidential client であり、
> CSRF 対策は `state` パラメータで行う（PKCE は不要かつ送っても無視される）。

---

## スコープ

### In Scope
- `GET /auth/login` — state 生成・KV 保存・Reddit 認可 URL へリダイレクト（`duration=permanent` 必須）
- `GET /auth/callback` — code 交換・アクセストークン取得・KV 保存・JWT 発行・セッション Cookie 設定
- `POST /auth/logout` — セッション Cookie 削除 + KV のトークン削除
- `refreshAccessToken()` — トークン有効期限チェック + リフレッシュ（内部ユーティリティ）

### Out of Scope
- 認証ミドルウェア（→ #4）
- フロントエンドのログイン画面（→ #7）

---

## タスク

- [ ] `src/routes/auth.ts` を作成
  - `GET /auth/login` — state を `crypto.randomUUID()` で生成、KV に `oauth_state:{state}` キーで 5 分 TTL 保存。認可 URL に **`duration=permanent`** を含める（これがないと refresh_token が発行されず、#14 の定期ポーリングが成立しない）
  - `GET /auth/callback` — state 検証・KV から削除 → Reddit トークンエンドポイントへ POST（Basic 認証: client_id + client_secret）→ ユーザー情報取得 → KV に `token:{userId}` 保存（**TTL なし**。refresh_token は失効まで使い続けるため、TTL で消すとログアウト扱いになる）→ JWT 発行（exp: 30 日）→ `session` Cookie に httpOnly/secure/SameSite=Lax + `Max-Age=2592000` で設定
  - `POST /auth/logout` — `session` Cookie を削除し、KV の `token:{userId}` も削除する
- [ ] `refreshAccessToken(userId, env)` をエクスポート関数として実装（有効期限 1 分前でリフレッシュ）
- [ ] `src/index.ts` に `app.route('/auth', auth)` を追加

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | `GET /auth/login` が Reddit 認可 URL（`https://www.reddit.com/api/v1/authorize?...`）へリダイレクトし、URL に `duration=permanent` と `state` が含まれる | ローカル `curl -L` |
| AC-2 | callback 後に `session` Cookie が設定され、httpOnly・secure・SameSite=Lax・Max-Age 属性を持つ | ブラウザ DevTools / curl |
| AC-3 | 不正な `state` パラメータで callback にアクセスすると `/?error=invalid_state` にリダイレクトする | ユニットテスト |
| AC-4 | `refreshAccessToken` はトークンが有効な場合 Reddit API を呼ばず KV の値をそのまま返す | ユニットテスト |
| AC-5 | `refreshAccessToken` は期限切れのトークンを自動更新し KV に保存する | ユニットテスト |
| AC-6 | `POST /auth/logout` で `session` Cookie と KV の `token:{userId}` が両方削除される | curl + KV 確認 |
| AC-7 | `tsc --noEmit` がエラーなく通る | CI |

---

## セキュリティ要件

- `state` は KV に一時保存し、callback 処理後に即削除する（リプレイ防止）
- Reddit client_secret はシークレット（`c.env.REDDIT_CLIENT_SECRET`）経由のみで参照する
- JWT の署名に使う `JWT_SECRET` は最低 32 バイトのランダム文字列とする
- JWT の `exp` は 30 日。Cookie の Max-Age と一致させる
- トークンを KV に保存する際、refresh_token は平文可（KV 自体がサーバーサイドストレージのため）
- 到達制御は前段の Cloudflare Access が担う（→ #2 / #4）。本フローは「どの Reddit アカウントとして API を叩くか」の認証

---

## 参考

- Reddit OAuth2: `https://www.reddit.com/dev/api/oauth`
- Hono JWT: `hono/jwt`
- Hono Cookie: `hono/cookie`
