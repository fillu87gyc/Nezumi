# TICKET-011: 画像翻訳エンドポイント（Claude Vision OCR）

| 項目 | 値 |
|---|---|
| フェーズ | Phase 3 |
| ブランチ | `feat/phase3-image-translate-api` |
| 優先度 | P1 |
| 依存 | #4, #20 |

---

## 背景・目的

投稿画像内のテキストを Claude API の vision 機能で OCR し、日本語に翻訳して返す。  
1 回の API コールで OCR + 翻訳が完結し、結果を KV にキャッシュする。

---

## スコープ

### In Scope
- `POST /api/image-translate/translate` — 画像 URL + postId を受け取り翻訳結果を返す
- `GET /api/image-translate/quota` — OCR レート制限ステータス確認（デバッグ用）
- KV キャッシュ（`img-trans:{postId}`、7 日 TTL）
- `arrayBufferToBase64()` ユーティリティ

### Out of Scope
- OCR レート制限（トークンバケット）の実装（→ #20）
- ImageSwipe UI（→ #12）

---

## タスク

- [ ] `src/routes/image-translate.ts` を作成し `requireAuth` を適用
- [ ] `POST /api/image-translate/translate` を実装
  - `{ imageUrl, postId }` を受け取る
  - KV キャッシュ `img-trans:{postId}` をチェック → ヒット時はそのまま返す
  - 画像を `fetch(imageUrl)` → `arrayBuffer()` → base64
  - Claude API (`claude-sonnet-4-20250514`) に vision リクエスト送信
  - プロンプト: テキスト抽出 + 日本語翻訳、JSON 形式指定
  - レスポンスをパース → パース失敗時は `{ hasText: false, ... }` にフォールバック
  - 結果を KV に 7 日キャッシュ
- [ ] `GET /api/image-translate/quota` を実装（#20 実装前はスタブ `{ status: "ok" }` でよい）
- [ ] `arrayBufferToBase64()` ユーティリティを実装
- [ ] `src/types.ts` に `ImageTranslateResult` 型を追加
- [ ] `src/index.ts` に `app.route('/api/image-translate', imageTranslate)` を追加

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | テキストを含む画像 URL を POST すると `{ hasText: true, translatedText, textRegions }` が返る | ローカルテスト |
| AC-2 | テキストのない画像を POST すると `{ hasText: false }` が返る | ローカルテスト |
| AC-3 | 同じ `postId` を2回 POST すると2回目は KV キャッシュから返る（Claude API を呼ばない） | ローカルテスト |
| AC-4 | 画像フェッチが失敗した場合（404 等）は `400 { error: 'Image fetch failed' }` を返す | テスト |
| AC-5 | Claude API レスポンスが JSON でなくてもクラッシュしない（フォールバック動作） | テスト |
| AC-6 | CLAUDE_API_KEY が `c.env.CLAUDE_API_KEY` 経由でのみ参照されている | コードレビュー |
| AC-7 | `tsc --noEmit` がエラーなく通る | CI |

---

## Claude API プロンプト仕様

```
この画像に含まれるテキストをすべて抽出し、日本語に翻訳してください。

出力形式（JSON）:
{
  "hasText": true/false,
  "originalText": "抽出した原文",
  "translatedText": "日本語翻訳",
  "textRegions": [
    { "original": "テキスト1", "translated": "翻訳1" }
  ]
}

テキストがない場合は hasText: false で返してください。JSONのみ返してください。
```

---

## 型定義

```typescript
export interface ImageTranslateResult {
  hasText: boolean
  originalText: string
  translatedText: string
  textRegions: { original: string; translated: string }[]
}
```
