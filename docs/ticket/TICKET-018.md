# TICKET-018: 設定画面 UI（翻訳・フィルター・NGワード）

| 項目 | 値 |
|---|---|
| フェーズ | Phase 5 |
| ブランチ | `feat/phase5-settings-ui` |
| 優先度 | P1 |
| 依存 | #15, #17 |

---

## 背景・目的

ユーザーが翻訳・フィルタリング・NGワード・通知の設定を変更できる画面を実装する。  
設定は `localStorage` に保存し、フィード取得時のクエリパラメータに反映させる。

---

## スコープ

### In Scope
- `client/src/components/Settings/Settings.tsx` + `Settings.css`
- 翻訳設定（自動翻訳・画像翻訳・コメント翻訳）
- フィルター設定（NSFW・最低スコア・最低コメント数）
- NGワード管理（追加・削除）
- 通知設定（プッシュ通知 ON/OFF）
- `client/src/stores/settingsStore.ts`（Zustand）

### Out of Scope
- D1 へのサーバーサイド設定同期（今フェーズでは localStorage のみ）
- カスタムフィード作成 UI

---

## タスク

- [ ] `zustand` をインストール
- [ ] `client/src/stores/settingsStore.ts` を Zustand で実装
  ```typescript
  interface SettingsState {
    defaultLanguage: 'ja' | 'en'
    autoTranslate: boolean
    translateImages: boolean
    translateComments: boolean
    minScore: number
    minComments: number
    filterNsfw: boolean
    ngWords: string[]
    pushEnabled: boolean
  }
  ```
  - `persist` ミドルウェアで localStorage に永続化
- [ ] `client/src/components/Settings/Settings.tsx` を作成
  - 翻訳セクション: `autoTranslate`, `translateImages`, `translateComments` のトグル
  - フィルターセクション: `filterNsfw` トグル、`minScore`/`minComments` のスライダー
  - NGワードセクション: テキスト入力 + 追加ボタン（Enter キー対応）、タグ一覧 + 削除ボタン
  - 通知セクション: `pushEnabled` トグル（ON にすると `usePushNotification` を呼び出し）
  - プロフィール表示（ユーザー名・karma）
- [ ] `client/src/components/Settings/Settings.css` を作成（モックアップ参考）
- [ ] `client/src/App.tsx` に `/settings` ルートを追加
- [ ] フィード取得フックが `settingsStore` から `autoTranslate` を読んで `?translate=` パラメータに渡す

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | 設定画面でトグルを変更するとすぐに反映される | ブラウザ確認 |
| AC-2 | ページリロード後も設定が保持される（localStorage 永続化） | ブラウザ確認 |
| AC-3 | 「自動翻訳 OFF」にするとフィードの `titleJa` が表示されなくなる | ブラウザ確認 |
| AC-4 | NGワードを追加するとタグとして表示される | ブラウザ確認 |
| AC-5 | NGワードタグの「×」をクリックすると削除される | ブラウザ確認 |
| AC-6 | NGワード入力欄で Enter を押すと追加される | ブラウザ確認 |
| AC-7 | 最低スコアスライダーの値がリアルタイムで表示に反映される | ブラウザ確認 |
| AC-8 | 通知トグルをオンにすると権限ダイアログが表示される | ブラウザ確認 |
| AC-9 | モバイル幅（390px）で崩れがない | ブラウザ確認 |
| AC-10 | `tsc --noEmit` がエラーなく通る | CI |
