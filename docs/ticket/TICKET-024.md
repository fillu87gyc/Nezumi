# TICKET-024: 投稿詳細画面（コメント表示）

| 項目 | 値 |
|---|---|
| フェーズ | Phase 2 |
| ブランチ | `feat/phase2-post-detail` |
| 優先度 | P1 |
| 依存 | #7, #10 |

---

## 背景・目的

#5 で実装済みの `GET /api/feed/post/:postId`（投稿詳細 + コメントツリー）を表示する画面が
存在しないため、API が宙に浮いている。フィードカードのタップで遷移する投稿詳細画面を実装する。

---

## スコープ

### In Scope
- `client/src/components/PostDetail/PostDetail.tsx` + `PostDetail.css`
- `client/src/components/Comment/Comment.tsx` — ネストコメント（再帰レンダリング）
- ルーティング `/post/:postId` の追加
- コメントソート切り替え（best / top / new）
- タイトル・本文は #10 の `TextSwipe` を再利用（翻訳対応）

### Out of Scope
- コメントの翻訳（コメントは原文表示。翻訳対応する場合は別チケット）
- コメント投稿・返信（read-only クライアントのため対象外）

---

## タスク

- [ ] `client/src/components/PostDetail/PostDetail.tsx` を作成
  - `useQuery` で `/api/feed/post/:postId?sort=...` を取得
  - 投稿ヘッダー（subreddit・author・スコア・投稿日時）
  - タイトル / selftext は `titleJa` / `selftextJa` があれば `<TextSwipe>` でラップ
  - 画像投稿は `<ImageSwipe>`（#12 実装後に差し替え。それまでは `<img>`）
- [ ] `client/src/components/Comment/Comment.tsx` を作成
  - author・スコア・本文・投稿日時
  - `replies` を再帰レンダリング（depth に応じた左インデント、最大 depth 5）
  - 折りたたみトグル（タップでスレッドを畳む）
- [ ] コメントソートのセレクタ（best / top / new）を追加し、変更時に再取得
- [ ] `App.tsx` に `/post/:postId` ルートを追加し、`FeedCard` のタイトル/カード本体から `<Link>` で遷移
- [ ] 戻る操作でフィードのスクロール位置が保持されることを確認（React Router の履歴で対応）

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | フィードカードをタップすると `/post/:postId` に遷移し、投稿本文が表示される | ブラウザ確認 |
| AC-2 | コメントがネスト構造（インデント付き）で表示される | ブラウザ確認 |
| AC-3 | コメントスレッドをタップで折りたたみ/展開できる | ブラウザ確認 |
| AC-4 | ソート切り替えでコメントの並びが変わる | ブラウザ確認 |
| AC-5 | タイトルに `titleJa` がある場合、詳細画面でもスワイプで原文に切り替えられる | ブラウザ確認 |
| AC-6 | ブラウザバックでフィードに戻り、スクロール位置が保持される | ブラウザ確認 |
| AC-7 | モバイル幅（390px）で崩れがない | ブラウザ確認 |
| AC-8 | `tsc --noEmit` がエラーなく通る | CI |

---

## UI 参考

`docs/mockup.html` の詳細画面（ある場合）またはフィードカードのスタイルを踏襲する。
