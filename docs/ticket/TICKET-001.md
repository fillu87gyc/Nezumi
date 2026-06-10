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

- [ ] `npm create hono@latest` でルートプロジェクト初期化
- [ ] `client/` に `npm create vite@latest -- --template react-ts` 実行
- [ ] ルート `package.json` に workspace スクリプト追加
  ```json
  "scripts": {
    "dev:worker": "wrangler dev --local",
    "dev:client": "cd client && vite",
    "build": "cd client && vite build",
    "deploy": "bash deploy.sh"
  }
  ```
- [ ] `client/` に PWA 依存追加
  ```bash
  npm install -D vite-plugin-pwa workbox-window
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
| AC-2 | `cd client && npm run dev` が起動し `http://localhost:5173` でページが表示される | ブラウザ確認 |
| AC-3 | `tsc --noEmit` がエラーなく通る | CI |
| AC-4 | `eslint src/ client/src/` がエラーなく通る | CI |
| AC-5 | `.gitignore` に `node_modules/` と `.wrangler/` が含まれる | コードレビュー |

---

## 備考

- Node.js 20 LTS 以上を前提とする
- Wrangler v3 系を使用
