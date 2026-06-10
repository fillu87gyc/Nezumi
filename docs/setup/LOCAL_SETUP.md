# ローカル開発セットアップ

## 前提条件

- Node.js 24+（`mise install` で自動インストール）
- pnpm 11+

## 1. 依存インストール

```bash
mise install
pnpm install
```

## 2. KV namespace 発行

```bash
wrangler kv:namespace create KV
# 出力された id を wrangler.toml の KV id に設定
```

## 3. D1 データベース作成

```bash
wrangler d1 create nezumi-db
# 出力された database_id を wrangler.toml に設定
```

## 4. マイグレーション実行

```bash
# ローカル
wrangler d1 migrations apply nezumi-db --local

# 本番
wrangler d1 migrations apply nezumi-db --remote
```

## 5. 環境変数設定

```bash
cp .dev.vars.example .dev.vars
# .dev.vars を編集して実際の値を設定
```

## 6. シークレット設定（本番）

```bash
wrangler secret put REDDIT_CLIENT_ID
wrangler secret put REDDIT_CLIENT_SECRET
wrangler secret put DEEPL_API_KEY
wrangler secret put CLAUDE_API_KEY
wrangler secret put JWT_SECRET
wrangler secret put VAPID_PRIVATE_KEY
wrangler secret put VAPID_PUBLIC_KEY
```

## 7. 開発サーバー起動

```bash
# Workers バックエンド（ターミナル 1）
pnpm dev:worker

# React フロントエンド（ターミナル 2）
pnpm dev:client
```
