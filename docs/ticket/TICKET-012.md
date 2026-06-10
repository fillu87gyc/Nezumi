# TICKET-012: ImageSwipe コンポーネント

| 項目 | 値 |
|---|---|
| フェーズ | Phase 3 |
| ブランチ | `feat/phase3-image-swipe` |
| 優先度 | P1 |
| 依存 | #10, #11 |

---

## 背景・目的

投稿画像をスワイプすると Claude Vision 翻訳結果がオーバーレイ表示されるコンポーネントを実装する。  
翻訳はスワイプ時にオンデマンド取得（初回のみ API 呼び出し）。

---

## スコープ

### In Scope
- `client/src/components/ImageSwipe/ImageSwipe.tsx` + `ImageSwipe.css`
- FeedCard への組み込み
- ローディングスピナー・翻訳なし時の表示

### Out of Scope
- 翻訳 API 自体（→ #11）
- 設定による画像翻訳 ON/OFF（→ #18）

---

## タスク

- [ ] `client/src/components/ImageSwipe/ImageSwipe.tsx` を作成
  - Props: `{ imageUrl: string; postId: string }`
  - 左パネル: 原画像
  - 右パネル: 背景に暗くした元画像 + 翻訳テキストオーバーレイ
  - `onScroll` でパネルインデックスを追跡
  - インデックスが 1 になったとき（翻訳パネルに移動）かつ未取得なら `/api/image-translate/translate` を fetch
  - ローディング中: スピナー表示
  - `hasText: false` の場合: 「テキストが見つかりませんでした」表示
  - 翻訳成功: `textRegions` を列挙（翻訳テキスト + 原文小テキスト）
  - ドットインジケーター + ヒントテキスト
- [ ] `client/src/components/ImageSwipe/ImageSwipe.css` を作成（モックアップ参考）
- [ ] `client/src/components/FeedCard/FeedCard.tsx` を更新
  - `preview` がある場合に `<ImageSwipe>` を表示

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | フィードカードの画像を左スワイプすると翻訳パネルが表示される | ブラウザ確認 |
| AC-2 | 翻訳パネルに移動した瞬間にスピナーが表示される | ブラウザ確認 |
| AC-3 | 翻訳取得後にテキストリージョンが表示される | ブラウザ確認 |
| AC-4 | テキストのない画像では「テキストが見つかりませんでした」が表示される | ブラウザ確認 |
| AC-5 | 一度翻訳したパネルは再度スワイプしても API を再呼び出ししない | DevTools Network タブ確認 |
| AC-6 | 画像は `loading="lazy"` で遅延読み込みされる | コードレビュー |
| AC-7 | モバイル幅（390px）で画像が崩れない | ブラウザ確認 |
| AC-8 | `tsc --noEmit` がエラーなく通る | CI |

---

## デザイン仕様

| 要素 | 値 |
|---|---|
| 翻訳パネル背景 | `#111` |
| 元画像（翻訳側） | `opacity: 0.25; filter: blur(2px)` |
| テキストカード背景 | `rgba(0,0,0,0.75)` + `backdrop-filter: blur(4px)` |
| 翻訳テキスト | `#fff`, 15px |
| 原文小テキスト | `rgba(255,255,255,0.5)`, 11px |
| スピナー | 32px, ボーダー方式 |
