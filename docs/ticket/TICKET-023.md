# TICKET-023: 設定 CRUD API（フィルター設定・NGワード）

| 項目 | 値 |
|---|---|
| フェーズ | Phase 5 |
| ブランチ | `feat/phase5-settings-api` |
| 優先度 | P1 |
| 依存 | #16 |

---

## 背景・目的

サーバーサイドフィルタリング（#17）は D1 のユーザー設定・NGワードを参照するが、
それらを**書き込む手段**がないとフィルタは常に空設定で動いてしまう。  
設定画面（#18）から呼び出される設定 CRUD API を実装し、#17 と #18 を接続する。

---

## スコープ

### In Scope
- `GET /api/settings` — フィルター設定 + NGワード一覧の取得
- `PUT /api/settings` — フィルター設定（minScore / minComments / filterNsfw）の更新
- `POST /api/settings/ng-words` — NGワード追加
- `DELETE /api/settings/ng-words/:id` — NGワード削除

### Out of Scope
- フィルタリングロジック自体（→ #17）
- 設定 UI（→ #18）
- カスタムフィードの CRUD（将来の追加 PR）

---

## タスク

- [ ] `src/routes/settings.ts` を作成（認証は #4 の index.ts 集中適用でかかる）
- [ ] `GET /api/settings` を実装
  - `users.settings`（JSON）と `ng_words` テーブルを読み、
    `{ minScore, minComments, filterNsfw, ngWords: [{ id, word, matchType, target }] }` を返す
  - `users` 行が未作成の場合はデフォルト値を返す
- [ ] `PUT /api/settings` を実装
  - `{ minScore?, minComments?, filterNsfw? }` を受け取り `users.settings` にマージ保存
  - 値のバリデーション（minScore/minComments: 0 以上の整数、filterNsfw: boolean）
- [ ] `POST /api/settings/ng-words` を実装
  - `{ word, matchType, target }` を受け取り `ng_words` に INSERT、作成行を返す
  - バリデーション: word は 1〜100 文字、matchType/target は enum 値のみ。
    `matchType: 'regex'` の場合は `new RegExp(word)` が throw しないことを確認して 400 を返す
- [ ] `DELETE /api/settings/ng-words/:id` を実装（自分の `user_id` の行のみ削除）
- [ ] `src/index.ts` に `app.route('/api/settings', settings)` を追加

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | `GET /api/settings` が設定とNGワード一覧を返す（未設定時はデフォルト値） | ユニットテスト |
| AC-2 | `PUT /api/settings` で更新した値が `GET` で返り、D1 に永続化されている | ユニットテスト |
| AC-3 | `POST /api/settings/ng-words` で追加した語が次回 `GET /api/feed/home` のフィルタに反映される（#17 結合） | ローカルテスト |
| AC-4 | `DELETE /api/settings/ng-words/:id` で削除される | ユニットテスト |
| AC-5 | 不正な値（負数・100文字超・不正な正規表現・enum 外）は `400` を返す | ユニットテスト |
| AC-6 | `tsc --noEmit` がエラーなく通る | CI |

---

## 備考

- #6 の KV キャッシュは URL 単位（ttl 60〜120s）のため、設定変更後も最大 ttl 秒は旧フィルタ結果が返る。
  許容範囲とするが、気になる場合は `PUT`/`POST`/`DELETE` 成功時に `cache:` プレフィックスのフィードキャッシュを削除する
