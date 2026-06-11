# TICKET-019: 仮想スクロール + 画像遅延読み込み

| 項目 | 値 |
|---|---|
| フェーズ | Phase 6 |
| ブランチ | `feat/phase6-virtual-scroll` |
| 優先度 | P2 |
| 依存 | #7 |

---

## 背景・目的

大量の投稿（100件以上）を読み込んでも DOM が肥大化しないよう仮想スクロールを導入する。  
画像の遅延読み込みと組み合わせて初期表示を高速化する。

---

## スコープ

### In Scope
- `@tanstack/react-virtual` による仮想スクロール
- 画像への `loading="lazy"` + `decoding="async"` 追加
- `client/src/components/Feed/Feed.tsx` の更新

### Out of Scope
- 無限スクロールのページネーション自体（#7 で実装済み）

---

## タスク

- [ ] `@tanstack/react-virtual` をインストール
- [ ] `client/src/components/Feed/Feed.tsx` を仮想スクロール対応に更新
  ```typescript
  const rowVirtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,  // 平均カード高さ
    overscan: 5,
  })
  ```
  - `parentRef` を Feed コンテナに付与（`overflow-y: auto` 必須）
  - `rowVirtualizer.getVirtualItems()` でレンダリング
  - コンテナ高さを `rowVirtualizer.getTotalSize()` に設定
- [ ] `FeedCard` の `<img>` すべてに `loading="lazy" decoding="async"` を追加
- [ ] `ImageSwipe` の `<img>` にも同様に追加（#12 の更新）

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | 100 件以上の投稿をロード後、DOM の `feed-card` 要素が 20 件以下に保たれる | DevTools Elements |
| AC-2 | スクロール中に表示がカクつかない（60fps を目標） | DevTools Performance |
| AC-3 | 画像に `loading="lazy"` 属性が設定されている | コードレビュー |
| AC-4 | 仮想スクロール導入後も無限スクロールが正常に機能する | ブラウザ確認 |
| AC-5 | `tsc --noEmit` がエラーなく通る | CI |

---

## 備考

- `estimateSize` は実測値に基づいて調整する（画像あり: 〜400px、テキストのみ: 〜150px）
- 動的なカード高さが問題になる場合は `measureElement` コールバックを使用
- フィードコンテナを `overflow-y: auto` にするとモバイルのドキュメントスクロール（アドレスバー収納・
  プルリフレッシュ）と干渉する場合がある。問題が出たら `useWindowVirtualizer`（window スクロール方式）に切り替える
