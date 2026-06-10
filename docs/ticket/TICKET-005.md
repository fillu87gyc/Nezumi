# TICKET-005: フィード・投稿詳細 API エンドポイント

| 項目 | 値 |
|---|---|
| フェーズ | Phase 1 |
| ブランチ | `feat/phase1-feed-api` |
| 優先度 | P0 |
| 依存 | #4 |

---

## 背景・目的

Reddit API を Workers 経由でプロキシし、クライアントが消費しやすい正規化済みデータを返す。  
アクセストークンは Workers 側で管理し、フロントエンドには一切露出しない。

---

## スコープ

### In Scope
- `GET /api/feed/home` — ホームフィード（sort・after・limit パラメータ対応）
- `GET /api/feed/r/:subreddit` — サブレディット別フィード
- `GET /api/feed/subreddits` — 購読サブレディット一覧
- `GET /api/feed/post/:postId` — 投稿詳細 + コメント（depth=5）
- `normalizePost()` / `normalizeComments()` — レスポンス正規化関数

### Out of Scope
- KV キャッシュ（→ #6）
- 翻訳統合（→ #9）

---

## タスク

- [ ] `src/routes/feed.ts` を作成し `requireAuth` を適用
- [ ] `GET /api/feed/home` を実装
  - クエリパラメータ: `sort`（hot/new/top, デフォルト hot）, `after`, `limit`（デフォルト 25）
  - `refreshAccessToken` でトークン取得 → Reddit API 呼び出し → `normalizePost` で変換
  - `{ posts, after }` を返す
- [ ] `GET /api/feed/r/:subreddit` を実装（home と同様の構造）
- [ ] `GET /api/feed/subreddits` を実装
  - `https://oauth.reddit.com/subreddits/mine/subscriber?limit=100` を呼び出し
  - `{ name, title, icon, subscribers }` の配列を返す
- [ ] `GET /api/feed/post/:postId` を実装
  - `sort` クエリパラメータ（best/top/new/controversial）対応
  - `[postData, commentsData]` を分解して `{ post, comments }` を返す
- [ ] `normalizePost()` を実装（下記フィールドを含む）
  ```typescript
  { id, title, author, subreddit, score, numComments, url, permalink,
    selftext, thumbnail, preview, isVideo, media, flair, createdAt, nsfw, spoiler, stickied }
  ```
- [ ] `normalizeComments()` を再帰的に実装（`kind === 't1'` のみ、replies を再帰）
- [ ] `src/index.ts` に `app.route('/api/feed', feed)` を追加

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | 認証済みで `GET /api/feed/home` が `{ posts: [...], after: "..." }` を返す | ローカル curl |
| AC-2 | `sort=new&limit=10` クエリが正しく Reddit API に渡る | ローカルテスト |
| AC-3 | `GET /api/feed/r/programming` がサブレディット固有の投稿を返す | ローカルテスト |
| AC-4 | `GET /api/feed/post/:id` が `{ post, comments }` を返し、コメントが入れ子になっている | ローカルテスト |
| AC-5 | `preview` フィールドの `&amp;` が `&` にデコードされている | ユニットテスト |
| AC-6 | 未認証リクエストは `401` を返す | ユニットテスト |
| AC-7 | `tsc --noEmit` がエラーなく通る | CI |

---

## レスポンス例

```json
{
  "posts": [
    {
      "id": "abc123",
      "title": "Rust compiler is 2.3× faster",
      "author": "rustacean_dev",
      "subreddit": "programming",
      "score": 4200,
      "numComments": 318,
      "preview": "https://i.redd.it/xxx.jpg",
      "createdAt": 1718000000,
      "nsfw": false
    }
  ],
  "after": "t3_abc124"
}
```
