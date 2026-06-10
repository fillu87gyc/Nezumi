# TICKET-001: プロジェクト初期化（Hono + Vite + PWA）

| 項目 | 値 |
|---|---|
| フェーズ | Phase 0 |
| ブランチ | `feat/phase0-project-init` |
| 優先度 | P0 |
| 依存 | なし |

---

## 背景・目的

Nezumi の開発基盤を整える。Hono on Cloudflare Workers をバックエンド、React + Vite を
フロントエンドとするモノレポ構成を確立し、ローカル開発が即座に始められる状態にする。

---

## スコープ

### In Scope
- Wrangler + Hono プロジェクトのスキャフォールド
- `client/` ディレクトリに React + Vite + TypeScript を追加
- `vite-plugin-pwa` / `workbox-window` の依存追加
- ESLint / TypeScript 設定の統一
- `.gitignore` の整備
- `package.json` の `scripts` 定義（`dev`, `build`, `deploy`）

### Out of Scope
- wrangler.toml の KV/D1 バインディング設定（→ #2）
- シークレット設定・Reddit API 申請（→ #2）

---

## タスク

- [ ] mise がインストール済みであることを確認し `.mise.toml` の node/pnpm バージョンを `mise install` で取得
- [ ] `pnpm create hono@latest .` でルートプロジェクト初期化（カレントディレクトリに展開）
- [ ] `client/` に `pnpm create vite@8 client -- --template react-ts` 実行
- [ ] `pnpm-workspace.yaml` で `client` をワークスペースとして宣言（既存ファイル）
- [ ] ルート `package.json` に engines フィールドとスクリプトを追加
  ```json
  {
    "engines": { "node": ">=24", "pnpm": ">=11" },
    "scripts": {
      "dev:worker": "wrangler dev --local",
      "dev:client": "pnpm --filter client dev",
      "build": "pnpm --filter client build",
      "test": "vitest run --passWithNoTests",
      "deploy": "bash deploy.sh"
    }
  }
  ```
- [ ] `vitest` を devDependency として追加（後続チケットのユニットテスト AC はすべて vitest 前提。`--passWithNoTests` によりテストゼロでも CI が通る）
- [ ] `client/` に PWA 依存追加（Vite v8 対応版を明示）
  ```bash
  pnpm --filter client add -D vite@^8 vite-plugin-pwa workbox-window
  ```
- [ ] `client/vite.config.ts` に `@vitejs/plugin-react` + `VitePWA` の骨格を追加（詳細は #13）
- [ ] `tsconfig.json`（ルート）を Workers 用に設定
  ```json
  { "compilerOptions": { "target": "ES2022", "module": "ESNext", "lib": ["ES2022"], "strict": true } }
  ```
- [ ] `.gitignore` に `node_modules/`, `dist/`, `.wrangler/`, `client/dist/` を追加
- [ ] `src/index.ts` に Hono アプリの最小実装（`GET /` → `"ok"`）を追加
- [ ] `client/src/main.tsx` と `client/src/App.tsx` の最小実装を確認

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | `wrangler dev --local` が起動し `curl localhost:8787/` が `"ok"` を返す | ローカル実行 |
| AC-2 | `pnpm dev:client` が起動し `http://localhost:5173` でページが表示される | ブラウザ確認 |
| AC-3 | `tsc --noEmit` がエラーなく通る | CI |
| AC-4 | `eslint src/ client/src/` がエラーなく通る | CI |
| AC-5 | `.gitignore` に `node_modules/` と `.wrangler/` が含まれる | コードレビュー |
| AC-6 | `pnpm test` が（テストゼロの状態で）正常終了する | ローカル実行 |

---

## 備考

- Node.js 24 + pnpm 11 を前提とする（`.mise.toml` でバージョンを固定）
- Wrangler は v4 系を使用（v3 は旧世代。`[assets]` 等の新機能サポートのため v4 を前提とする）
- Vite v8 / vite-plugin-pwa の組み合わせは着手時点での安定版対応を確認してからバージョンを固定すること（DEPENDENCY_POLICY の7日ルール対象）
- パッケージ操作はすべて pnpm に統一する（npm コマンドを混在させない）
- `mise install` を実行してからセットアップを開始すること
