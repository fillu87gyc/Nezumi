# TICKET-009: フィード取得時の自動翻訳統合

| 項目 | 値 |
|---|---|
| フェーズ | Phase 2 |
| ブランチ | `feat/phase2-feed-translate` |
| 優先度 | P0 |
| 依存 | #8 |

---

## 背景・目的

フィード API の Workers 内で翻訳バッチ処理を呼び出し、クライアントに翻訳済みフィールド
（`titleJa`, `selftextJa`）を付加したレスポンスを返す。  
クライアントは追加の翻訳 API 呼び出しなしに表示できる。

---

## スコープ

### In Scope
- `src/routes/feed.ts` の修正（`/home`, `/r/:subreddit` に翻訳統合）
- `batchTranslatePosts()` 内部関数の追加
- `translate` クエリパラメータ（`true`/`false`）による翻訳 ON/OFF

### Out of Scope
- TextSwipe UI（→ #10）
- コメント翻訳（Phase 5 以降で検討）

---

## タスク

- [ ] `src/lib/translate.ts` に `translateBatch(posts, env)` 関数を実装
  - DeepL の `batch` エンドポイント相当のロジックを直接呼び出す（HTTP ではなく内部関数呼び出し）
  - `{ [id]: { title, selftext? } }` を返す
- [ ] `src/routes/feed.ts` の `GET /home` と `GET /r/:subreddit` を修正
  - クエリパラメータ `translate=true`（デフォルト）の場合、取得後に `batchTranslatePosts` を呼ぶ
  - 各 post に `titleJa?` と `selftextJa?` を付加して返す
  - `translate=false` の場合は翻訳なしでそのまま返す
- [ ] `src/types.ts` の `Post` 型に `titleJa?` / `selftextJa?` を追加

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | `GET /api/feed/home` のレスポンスに `titleJa` フィールドが含まれる | ローカル curl |
| AC-2 | `translate=false` クエリを付けると `titleJa` が含まれない | ローカルテスト |
| AC-3 | `titleJa` が元の `title` と異なる（翻訳されている）ことをサンプルで確認 | 手動確認 |
| AC-4 | selftext のある投稿は `selftextJa` も付加される | ローカルテスト |
| AC-5 | 翻訳が KV キャッシュから返る場合も `titleJa` が正しく設定される | ローカルテスト |
| AC-6 | `tsc --noEmit` がエラーなく通る | CI |

---

## レスポンス差分

```diff
 {
   "id": "abc123",
   "title": "Rust compiler is 2.3× faster",
+  "titleJa": "Rustコンパイラが2.3倍高速化",
   "selftext": "Today the Rust team announced...",
+  "selftextJa": "本日、Rustチームは..."
 }
```
