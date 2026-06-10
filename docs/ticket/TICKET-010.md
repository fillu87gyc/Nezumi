# TICKET-010: TextSwipe コンポーネント + FeedCard 統合

| 項目 | 値 |
|---|---|
| フェーズ | Phase 2 |
| ブランチ | `feat/phase2-text-swipe` |
| 優先度 | P0 |
| 依存 | #7, #9 |

---

## 背景・目的

タイトル・本文をスワイプで原文 ↔ 翻訳に切り替えられる UI を実装し、FeedCard に組み込む。  
CSS scroll snap を使ったネイティブスクロールで実現する。

---

## スコープ

### In Scope
- `client/src/components/TextSwipe/TextSwipe.tsx` + `TextSwipe.css`
- `client/src/components/FeedCard/FeedCard.tsx` の更新（翻訳フィールド対応）
- 言語インジケーター（ドット + ラベル）

### Out of Scope
- ImageSwipe（→ #12）
- 投稿詳細でのコメント翻訳

---

## タスク

- [ ] `client/src/components/TextSwipe/TextSwipe.tsx` を作成
  - Props: `{ original: string; translated: string; className?: string }`
  - `scroll-snap-type: x mandatory` によるスワイプ実装
  - `onScroll` でアクティブインデックスを追跡
  - ドットインジケーター（翻訳: アクセントカラー 16px、原文: グレー 6px）
  - ラベル（`🇯🇵 日本語` / `🇺🇸 Original`）
- [ ] `client/src/components/TextSwipe/TextSwipe.css` を作成（モックアップ参考）
- [ ] `client/src/components/FeedCard/FeedCard.tsx` を更新
  - `titleJa` がある場合はタイトルを `<TextSwipe>` でラップ
  - `titleJa` がない（翻訳不要）場合は `<h2>` のまま
  - `selftextJa` がある場合は本文を `<TextSwipe>` でラップ

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | フィードカードのタイトルが日本語で表示される | ブラウザ確認 |
| AC-2 | 左右スワイプで日本語 ↔ 英語原文が切り替わる | ブラウザ確認（タッチ/マウスドラッグ） |
| AC-3 | スワイプに連動してドットインジケーターが切り替わる | ブラウザ確認 |
| AC-4 | ラベルが日本語パネルでは「🇯🇵 日本語」、英語パネルでは「🇺🇸 Original」になる | ブラウザ確認 |
| AC-5 | `titleJa` が undefined の投稿はスワイプ UI にならない（`<h2>` のまま） | ブラウザ確認 |
| AC-6 | スクロールバーが非表示である | ブラウザ確認 |
| AC-7 | モバイル幅（390px）でスワイプが正常に動作する | ブラウザ確認 |
| AC-8 | `tsc --noEmit` がエラーなく通る | CI |

---

## デザイン仕様

| 要素 | 値 |
|---|---|
| 翻訳パネル背景 | `#f8f9fa`（ライト）/ `var(--surface)` (ダーク) |
| 原文パネル背景 | `#fff` (ライト) / `var(--surface2)` (ダーク) |
| アクティブドット | `#ff4500`, width 16px |
| 非アクティブドット | `#d0d0d0`, width 6px |
