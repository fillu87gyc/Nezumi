# TICKET-008: DeepL 翻訳プロキシ API（単体・バッチ）

| 項目 | 値 |
|---|---|
| フェーズ | Phase 2 |
| ブランチ | `feat/phase2-deepl-api` |
| 優先度 | P0 |
| 依存 | #4 |

---

## 背景・目的

DeepL API キーをクライアントに露出させずに翻訳を提供する。  
KV キャッシュで同一テキストの重複 API コールを防ぎ、無料枠（50万文字/月）を効率的に使う。

---

## スコープ

### In Scope
- `POST /api/translate/text` — 単一テキスト翻訳
- `POST /api/translate/batch` — 複数テキスト一括翻訳（最大 50 テキスト/リクエスト）
- KV キャッシュ（テキストハッシュベース、7 日 TTL）

### Out of Scope
- フィードへの統合（→ #9）
- 画像翻訳（→ #11）

---

## タスク

- [ ] `src/routes/translate.ts` を作成し `requireAuth` を適用
- [ ] `POST /api/translate/text` を実装
  - `{ text, sourceLang?, targetLang? }` を受け取る（デフォルト: EN→JA）
  - 空文字は `{ translated: '' }` をそのまま返す
  - キャッシュキー: `trans:{sha256(text).slice(0,16)}:{targetLang}`
  - キャッシュヒット時: `{ translated, cached: true }`
  - DeepL API（`api-free.deepl.com`）に POST し結果をキャッシュ後に返す
- [ ] `POST /api/translate/batch` を実装
  - `{ texts: [{ id, title, selftext? }], targetLang? }` を受け取る
  - 各テキストのキャッシュを並列チェック
  - 未キャッシュ分を 50 件チャンクに分割して DeepL バッチ翻訳
  - `{ results: { [id]: { title, selftext? } } }` を返す
- [ ] `hashText(text)` ユーティリティを実装（SHA-256 の先頭 16 hex 文字）
- [ ] `chunkArray<T>()` ユーティリティを実装
- [ ] `src/index.ts` に `app.route('/api/translate', translate)` を追加

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | `POST /api/translate/text` に英語テキストを送ると日本語翻訳が返る | ローカル curl |
| AC-2 | 同じテキストを2回送ると2回目は `cached: true` で返る | curl |
| AC-3 | 空テキストを送ると `{ translated: '' }` が返る（DeepL を呼ばない） | テスト |
| AC-4 | `POST /api/translate/batch` で複数投稿の翻訳が一括で返る | ローカルテスト |
| AC-5 | 51件以上のテキストが2チャンクに分割されて翻訳される | ユニットテスト |
| AC-6 | DeepL API キーが `c.env.DEEPL_API_KEY` 経由でのみ参照されている | コードレビュー |
| AC-7 | `tsc --noEmit` がエラーなく通る | CI |

---

## リクエスト / レスポンス例

```
POST /api/translate/text
{ "text": "Rust compiler is 2.3× faster", "targetLang": "JA" }
→ { "translated": "Rustコンパイラが2.3倍高速化" }

POST /api/translate/batch
{ "texts": [{ "id": "abc", "title": "Hello world" }] }
→ { "results": { "abc": { "title": "こんにちは世界" } } }
```

---

## 備考

- DeepL 無料枠は 500,000 文字/月。フィード 25 件 × タイトル平均 80 文字 ≈ 2,000 文字/フェッチ。
- キャッシュにより同じ投稿の再翻訳は発生しない
