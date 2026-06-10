# TICKET-007: React 基本フィード UI（Feed / FeedCard）

| 項目 | 値 |
|---|---|
| フェーズ | Phase 1 |
| ブランチ | `feat/phase1-feed-ui` |
| 優先度 | P0 |
| 依存 | #5 |

---

## 背景・目的

実際の Reddit 投稿データを一覧表示する基本フィード UI を構築する。  
無限スクロール・ローディングスケルトン・ナビゲーションを含む。

---

## スコープ

### In Scope
- `client/src/components/Feed/Feed.tsx` — 無限スクロールフィードコンテナ
- `client/src/components/FeedCard/FeedCard.tsx` — 投稿カード（翻訳なし版）
- `client/src/hooks/useIntersection.ts` — Intersection Observer フック
- `client/src/api/client.ts` — fetch ラッパー
- `client/src/App.tsx` — ルーティング骨格（React Router or 簡易実装）
- ログイン画面の最小実装（`/auth/login` へのリンクのみ）

### Out of Scope
- TextSwipe / ImageSwipe（→ #10, #12）
- 翻訳表示（→ #9, #10）
- 設定画面（→ #18）

---

## タスク

- [ ] `@tanstack/react-query` をインストール
- [ ] `client/src/api/client.ts` を作成（`fetch` ラッパー、エラー時 throw）
- [ ] `client/src/hooks/useIntersection.ts` を作成（`IntersectionObserver` でコールバック呼び出し）
- [ ] `client/src/components/FeedCard/FeedCard.tsx` を作成
  - meta（subreddit・author・投稿日時）
  - タイトル（`<h2>`）
  - プレビュー画像（あれば）
  - アクション（スコア・コメント数・外部リンク）
  - `formatTime(utc)` ユーティリティ（「3分前」形式）
- [ ] `client/src/components/Feed/Feed.tsx` を作成
  - `useInfiniteQuery` で `/api/feed/home` or `/api/feed/r/:subreddit` を取得
  - Intersection Observer で次ページ自動取得
  - ローディング中はスケルトン表示
- [ ] `client/src/App.tsx` を作成
  - `QueryClientProvider` でラップ
  - `/` → `<Feed />`、未ログイン時 → ログインボタン表示
- [ ] スタイルは CSS Modules または plain CSS（デザインは mock HTML を参考に dark テーマ）

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | ログイン済みで `/` にアクセスするとフィードに投稿が表示される | ブラウザ確認 |
| AC-2 | 下スクロールで自動的に次ページが読み込まれる | ブラウザ確認 |
| AC-3 | 読み込み中にスケルトンが表示される | ブラウザ確認 |
| AC-4 | 未ログイン時に Reddit ログインボタンが表示される | ブラウザ確認 |
| AC-5 | 各カードの「Reddit で開く」リンクが正しい Reddit URL を開く | ブラウザ確認 |
| AC-6 | モバイル幅（390px）で崩れがない | ブラウザ確認（DevTools） |
| AC-7 | `tsc --noEmit` がエラーなく通る | CI |

---

## UI 参考

`docs/` に添付のモックアップ HTML（`redditpwamock.html`）のフィード画面を参考にする。  
ダークテーマ（背景 `#0d0d0f`）・アクセントカラー `#ff4500`。
