# TICKET-002: wrangler.toml・環境変数・Reddit API 申請手順

| 項目 | 値 |
|---|---|
| フェーズ | Phase 0 |
| ブランチ | `feat/phase0-wrangler-config` |
| 優先度 | P0 |
| 依存 | #1 |

---

## 背景・目的

Workers が KV・D1・シークレットにアクセスできるよう `wrangler.toml` を設定し、
開発着手に必要な Reddit アプリ申請手順を文書化する。

---

## スコープ

### In Scope
- `wrangler.toml` の完全設定（KV・D1・assets。`workers_dev = false` を含む）
- `src/types.ts` の `Env` 型定義（バインディング一覧）
- ローカル開発用 `.dev.vars` テンプレート（`.dev.vars.example`）
- Reddit API 申請手順（`docs/setup/REDDIT_APP.md`）
- Cloudflare Access 設定手順（`docs/setup/ACCESS.md`）— 本アプリは個人利用のため、全エンドポイントを Access（メール認証）の背後に置く

### Out of Scope
- 実際の KV namespace ID・D1 database ID の発行（開発者が `wrangler` コマンドで発行）
- シークレットの実値設定

---

## タスク

- [ ] `wrangler.toml` を作成
  ```toml
  name = "nezumi"
  main = "src/index.ts"
  compatibility_date = "2026-05-01"  # 着手時点の直近日付に更新する
  compatibility_flags = ["nodejs_compat"]
  workers_dev = false  # Access を経由しない workers.dev 直アクセスを遮断（カスタムドメイン必須）

  [vars]
  ENVIRONMENT = "development"

  [[kv_namespaces]]
  binding = "KV"
  id = "REPLACE_WITH_KV_ID"

  [[d1_databases]]
  binding = "DB"
  database_name = "nezumi-db"
  database_id = "REPLACE_WITH_D1_ID"

  [assets]
  directory = "./client/dist"
  binding = "ASSETS"

  # Cron Trigger は Push 通知導入時に追加する（→ #14）
  ```
- [ ] `src/types.ts` に `Env` インターフェースを定義
  ```typescript
  export interface Env {
    KV: KVNamespace
    DB: D1Database
    ASSETS: Fetcher
    REDDIT_CLIENT_ID: string
    REDDIT_CLIENT_SECRET: string
    DEEPL_API_KEY: string
    CLAUDE_API_KEY: string
    JWT_SECRET: string
    BASE_URL: string
    ENVIRONMENT: string
    ACCESS_TEAM_DOMAIN: string  // 例: "myteam.cloudflareaccess.com"（→ #4 の Access JWT 検証で使用）
    ACCESS_AUD: string          // Access アプリケーションの Audience タグ
  }
  ```
- [ ] `.dev.vars.example` を作成（実値なし・コメント付き）
- [ ] `docs/setup/REDDIT_APP.md` を作成（申請 URL・手順・スコープ一覧）
- [ ] `docs/setup/LOCAL_SETUP.md` を作成（KV/D1 発行コマンドを含む）
- [ ] `docs/setup/ACCESS.md` を作成
  - カスタムドメインへの Access アプリケーション作成手順（Self-hosted）
  - ポリシー: 自分のメールアドレスのみ許可
  - セッション長: PWA の使い勝手のため最長（例: 1 ヶ月）に設定
  - `workers_dev = false` にしている理由（Access バイパス防止）の説明

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | `wrangler.toml` に KV・D1・assets・`workers_dev = false` が定義されている | コードレビュー |
| AC-2 | `src/types.ts` の `Env` に全バインディング・シークレットが型定義されている | TypeScript コンパイル |
| AC-3 | `.dev.vars.example` が存在し、実シークレットを含まない | コードレビュー |
| AC-4 | `.dev.vars` が `.gitignore` に含まれている | コードレビュー |
| AC-5 | `docs/setup/REDDIT_APP.md` に OAuth2 申請 URL とスコープ一覧が記載されている | ドキュメントレビュー |
| AC-6 | `docs/setup/LOCAL_SETUP.md` に KV namespace 発行・D1 DB 作成コマンドが記載されている | ドキュメントレビュー |
| AC-7 | `docs/setup/ACCESS.md` に Access アプリ作成・ポリシー・セッション長の手順が記載されている | ドキュメントレビュー |

---

## 必要な Reddit OAuth2 スコープ

```
read identity mysubreddits privatemessages
```

> 最小権限の原則: `subscribe` / `vote` / `submit` は対応する機能のチケットが存在しないため要求しない。
> 投票・投稿機能を将来追加する際にスコープを拡張する。

---

## 備考

- `wrangler.toml` の ID はプレースホルダーのままリポジトリにコミットしてよい
- 実際の ID は各開発者が `wrangler kv:namespace create KV` / `wrangler d1 create nezumi-db` で取得する
