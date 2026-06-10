CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  settings TEXT DEFAULT '{}',
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS ng_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  match_type TEXT DEFAULT 'contains',
  target TEXT DEFAULT 'all',
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS custom_feeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subreddits TEXT NOT NULL,
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
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  post_data TEXT NOT NULL,
  bookmarked_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_ng_words_user ON ng_words(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_feeds_user ON custom_feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_read_posts_user ON read_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
