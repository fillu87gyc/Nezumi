# TICKET-017: 投稿フィルタリングロジック（Workers）

| 項目 | 値 |
|---|---|
| フェーズ | Phase 5 |
| ブランチ | `feat/phase5-filter-logic` |
| 優先度 | P1 |
| 依存 | #16 |

---

## 背景・目的

NGワード・最低スコア・最低コメント数・NSFW フィルターをサーバーサイドで適用し、  
クライアントに届く前に不要な投稿を除外する。D1 に保存されたユーザー設定を参照する。

---

## スコープ

### In Scope
- `src/lib/filter.ts` — `filterPosts(posts, settings)` 純関数
- フィード API エンドポイントへのフィルター統合
- D1 からユーザーフィルター設定を取得するヘルパー

### Out of Scope
- 設定の書き込み API（→ #23）
- 設定 UI（→ #18）
- カスタムフィード（Phase 5 以降の追加 PR で対応）

---

## タスク

- [ ] `src/lib/filter.ts` を作成
  ```typescript
  interface FilterSettings {
    ngWords: { word: string; matchType: 'contains' | 'exact' | 'regex'; target: 'all' | 'title' | 'body' }[]
    minScore: number
    minComments: number
    filterNsfw: boolean
  }

  export function filterPosts(posts: Post[], settings: FilterSettings): Post[]
  ```
  - スコアフィルター: `post.score < settings.minScore` で除外
  - コメントフィルター: `post.numComments < settings.minComments` で除外
  - NSFW フィルター: `settings.filterNsfw && post.nsfw` で除外
  - NGワード: `target` に応じて `title` / `selftext` / 両方を対象に `matchType` でマッチング
    - `contains`: `text.toLowerCase().includes(word.toLowerCase())`
    - `exact`: `text.toLowerCase() === word.toLowerCase()`（contains と同様 case-insensitive に統一）
    - `regex`: `new RegExp(word, 'i').test(text)`（無効な正規表現と 100 文字超のパターンは無視。自分しか入力しない前提だが ReDoS の自損防止）
- [ ] `src/lib/userSettings.ts` に `getUserFilterSettings(userId, env)` を作成（D1 クエリ。`users.settings` JSON + `ng_words` テーブルを読む。**書き込みは #23 の設定 API が担当**）
- [ ] `src/routes/feed.ts` の `/home` と `/r/:subreddit` に `filterPosts` を統合
  - 翻訳の前にフィルタリングを行う（不要な翻訳 API コールを削減）

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | `filterPosts` はスコアが `minScore` 未満の投稿を除外する | ユニットテスト |
| AC-2 | `filterPosts` はコメント数が `minComments` 未満の投稿を除外する | ユニットテスト |
| AC-3 | `filterNsfw: true` のとき `nsfw: true` の投稿が除外される | ユニットテスト |
| AC-4 | `matchType: contains` のとき NGワードを含むタイトルの投稿が除外される | ユニットテスト |
| AC-5 | `matchType: regex` のとき正規表現でマッチした投稿が除外される | ユニットテスト |
| AC-6 | `matchType: exact` のとき完全一致のみ除外され、部分一致は除外されない | ユニットテスト |
| AC-7 | `target: title` のとき本文の NGワードは除外しない | ユニットテスト |
| AC-8 | フィルター設定が空の場合、全投稿がそのまま返る | ユニットテスト |
| AC-9 | 無効な正規表現でクラッシュしない（try/catch） | ユニットテスト |
| AC-10 | `tsc --noEmit` がエラーなく通る | CI |

---

## ユニットテストファイル

`src/lib/filter.test.ts` を作成し、上記 AC-1 〜 AC-9 を網羅するテストケースを記述する。
