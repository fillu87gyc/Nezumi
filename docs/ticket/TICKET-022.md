# TICKET-022: デプロイスクリプト + CI/CD 設定

| 項目 | 値 |
|---|---|
| フェーズ | Phase 6 |
| ブランチ | `feat/phase6-deploy` |
| 優先度 | P2 |
| 依存 | #1, #2 |

---

## 背景・目的

本番デプロイを 1 コマンドで実行できるスクリプトと、  
PR マージ時に自動でデプロイする GitHub Actions ワークフローを整備する。

---

## スコープ

### In Scope
- `deploy.sh` — フロントエンドビルド → D1 マイグレーション → Workers デプロイ
- `.github/workflows/deploy.yml` — `main` ブランチ push 時の自動デプロイ
- `.github/workflows/ci.yml` — PR 時の TypeScript チェック + テスト
- Reddit API レート制限ミドルウェア（`src/middleware/rateLimit.ts`）

### Out of Scope
- ステージング環境の分離（Phase 6 以降で検討）

---

## タスク

- [ ] `deploy.sh` を作成（実行権限付き）
  ```bash
  #!/bin/bash
  set -e
  echo "📦 フロントエンドビルド..."
  cd client && npm run build && cd ..
  echo "🗄️ D1 マイグレーション..."
  wrangler d1 migrations apply nezumi-db --remote
  echo "🚀 Workers デプロイ..."
  wrangler deploy
  echo "✅ デプロイ完了"
  ```
- [ ] `.github/workflows/ci.yml` を作成
  - トリガー: `pull_request` (main/develop ブランチ)
  - ジョブ:
    - `typecheck`: `tsc --noEmit`（ルート + client）
    - `lint`: `eslint src/ client/src/`
    - `test`: `vitest run`（テストファイルがある場合）
- [ ] `.github/workflows/deploy.yml` を作成
  - トリガー: `push` to `main`
  - 環境変数: Cloudflare API Token を GitHub Secrets から取得
  - ジョブ: `npm ci` → `npm run build` → `wrangler deploy`
- [ ] `src/middleware/rateLimit.ts` を作成
  ```typescript
  export const redditRateLimit = createMiddleware<{ Bindings: Env }>(...) // 90 req/min/user
  ```
  - KV キー `ratelimit:{userId}` で 1 分 TTL のカウンター
  - 90 件を超えたら `429` を返す
- [ ] `package.json` に `"test": "vitest run"` スクリプトを追加
- [ ] `docs/setup/DEPLOY.md` を作成（シークレット設定・初回デプロイ手順）

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | `bash deploy.sh` がエラーなく完了し Workers が更新される | ローカル実行 |
| AC-2 | PR 作成時に CI ワークフローが自動実行される | GitHub Actions |
| AC-3 | TypeScript エラーがある PR は CI が失敗する | GitHub Actions（エラー投入） |
| AC-4 | `main` へのマージ後に自動デプロイが実行される | GitHub Actions |
| AC-5 | レート制限ミドルウェアを 91 回以上呼び出すと `429` を返す | ユニットテスト |
| AC-6 | GitHub Secrets に `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` が設定されている | 手動確認 |

---

## 必要な GitHub Secrets

| シークレット名 | 説明 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Workers デプロイ権限トークン |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare アカウント ID |

---

## Cloudflare API Token 権限

- `Workers Scripts: Edit`
- `Workers KV Storage: Edit`
- `D1: Edit`
- `Cloudflare Pages: Edit`（静的アセット用）
