# TICKET-016: D1 スキーマ設計 + マイグレーション

| 項目 | 値 |
|---|---|
| フェーズ | Phase 5 |
| ブランチ | `feat/phase5-d1-schema` |
| 優先度 | P1 |
| 依存 | #2 |

---

## 背景・目的

ユーザーデータ（NGワード・カスタムフィード・既読・ブックマーク）を永続化するための  
D1 データベーススキーマを設計し、マイグレーションファイルを作成する。

---

## スコープ

### In Scope
- `migrations/001_init.sql` — 全テーブル定義
- テーブル: `users`, `ng_words`, `custom_feeds`, `read_posts`, `bookmarks`
- 各テーブルのインデックス

### Out of Scope
- フィルタリングロジック（→ #17）
- 設定 UI（→ #18）

---

## タスク

- [ ] `migrations/` ディレクトリを作成
- [ ] `migrations/001_init.sql` を作成（下記スキーマ）

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  settings TEXT DEFAULT '{}',  -- フィルター・翻訳設定の JSON（#23 の設定 API が読み書きする）
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS ng_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  match_type TEXT DEFAULT 'contains', -- contains | exact | regex
  target TEXT DEFAULT 'all',          -- all | title | body
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS custom_feeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subreddits TEXT NOT NULL,  -- JSON配列
  sort TEXT DEFAULT 'hot',
  min_score INTEGER DEFAULT 0,
  min_comments INTEGER DEFAULT 0,
  filter_nsfw INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS read_posts (
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  read_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  post_data TEXT NOT NULL,  -- JSON
  bookmarked_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ng_words_user ON ng_words(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_feeds_user ON custom_feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_read_posts_user ON read_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
```

- [ ] `docs/setup/LOCAL_SETUP.md` にマイグレーション実行コマンドを追記
  ```bash
  wrangler d1 migrations apply nezumi-db --local   # ローカル
  wrangler d1 migrations apply nezumi-db --remote  # 本番
  ```
- [ ] OAuth2 コールバック（`src/routes/auth.ts`）で `users` テーブルに upsert する処理を追加

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | `wrangler d1 migrations apply nezumi-db --local` がエラーなく完了する | ローカル実行 |
| AC-2 | 全テーブルが作成されている | `wrangler d1 execute nezumi-db --local --command ".tables"` |
| AC-3 | `ng_words`, `read_posts`, `bookmarks` テーブルに `user_id` のインデックスがある | SQL 確認 |
| AC-4 | ログイン後に `users` テーブルにレコードが作成される | ローカルテスト |
| AC-5 | 2回目のログインで upsert され重複レコードが発生しない | ローカルテスト |

---

## 備考

- `match_type` の `regex` は Workers 側で `new RegExp(word, 'i').test(text)` で評価
- `custom_feeds.subreddits` は JSON 配列文字列（SQLite に JSON 型はないため TEXT で保存）
- `read_posts` は軽量に保つため定期的な古いレコード削除を検討（Phase 6 以降）
- 単独利用のため `users` は実質 1 行だが、スキーマは user_id で正規化しておく
  （Reddit アカウントを将来切り替えてもデータが混ざらない）
- これらのテーブルへの書き込み API は #23（設定 CRUD API）が担当する
