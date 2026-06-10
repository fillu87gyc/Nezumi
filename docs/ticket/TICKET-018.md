# TICKET-018: 設定画面 UI（翻訳・フィルター・NGワード）

| 項目 | 値 |
|---|---|
| フェーズ | Phase 5 |
| ブランチ | `feat/phase5-settings-ui` |
| 優先度 | P1 |
| 依存 | #15, #17, #23 |

---

## 背景・目的

ユーザーが翻訳・フィルタリング・NGワード・通知の設定を変更できる画面を実装する。  
フィルター関連の設定は #23 の設定 API 経由で **D1 に保存**する（サーバーサイドフィルタ #17 が読むため、
localStorage だけに保存するとフィルタが機能しない）。表示専用のクライアント設定のみ localStorage に置く。

---

## スコープ

### In Scope
- `client/src/components/Settings/Settings.tsx` + `Settings.css`
- 翻訳設定（自動翻訳・画像翻訳）
- フィルター設定（NSFW・最低スコア・最低コメント数）— #23 API 経由で D1 に保存
- NGワード管理（追加・削除、matchType / target 指定）— #23 API 経由で D1 に保存
- 通知設定（プッシュ通知 ON/OFF）
- `client/src/stores/settingsStore.ts`（Zustand。クライアント専用設定のみ）

### Out of Scope
- 設定 API 自体（→ #23）
- カスタムフィード作成 UI
- コメント翻訳（どのフェーズでも未実装のため、トグルも置かない）

---

## タスク

- [ ] `zustand` をインストール
- [ ] `client/src/stores/settingsStore.ts` を Zustand で実装（**クライアント専用設定のみ**）
  ```typescript
  interface SettingsState {
    autoTranslate: boolean      // ?translate= パラメータに反映（表示制御なのでクライアント側）
    translateImages: boolean    // ImageSwipe の表示制御
    pushEnabled: boolean
  }
  ```
  - `persist` ミドルウェアで localStorage に永続化
- [ ] サーバー側設定（filterNsfw / minScore / minComments / ngWords）は
  `useQuery(['settings'], () => api.get('/api/settings'))` + `useMutation` で #23 API を読み書きする
- [ ] `client/src/components/Settings/Settings.tsx` を作成
  - 翻訳セクション: `autoTranslate`, `translateImages` のトグル
  - フィルターセクション: `filterNsfw` トグル、`minScore`/`minComments` のスライダー（変更は debounce して PUT）
  - NGワードセクション: テキスト入力 + 追加ボタン（Enter キー対応）、matchType（含む/完全一致/正規表現）と target（全体/タイトル/本文）のセレクト、タグ一覧 + 削除ボタン
  - 通知セクション: `pushEnabled` トグル（ON にすると `usePushNotification` を呼び出し）
  - プロフィール表示（ユーザー名・karma）
- [ ] `client/src/components/Settings/Settings.css` を作成（`docs/mockup.html` 参考）
- [ ] `client/src/App.tsx` に `/settings` ルートを追加
- [ ] フィード取得フックが `settingsStore` から `autoTranslate` を読んで `?translate=` パラメータに渡す

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | 設定画面でトグルを変更するとすぐに反映される | ブラウザ確認 |
| AC-2 | ページリロード後も設定が保持される（クライアント設定: localStorage、フィルター設定: D1） | ブラウザ確認 |
| AC-3 | 「自動翻訳 OFF」にするとフィードの `titleJa` が表示されなくなる | ブラウザ確認 |
| AC-4 | NGワードを追加すると、**次のフィード取得から該当投稿がサーバー側で除外される**（#17 との結合確認） | ブラウザ確認 + API レスポンス確認 |
| AC-5 | NGワードタグの「×」をクリックすると削除され、フィードに再び表示される | ブラウザ確認 |
| AC-6 | NGワード入力欄で Enter を押すと追加される | ブラウザ確認 |
| AC-7 | 最低スコアスライダーの値がリアルタイムで表示に反映される | ブラウザ確認 |
| AC-8 | 通知トグルをオンにすると権限ダイアログが表示される | ブラウザ確認 |
| AC-9 | モバイル幅（390px）で崩れがない | ブラウザ確認 |
| AC-10 | `tsc --noEmit` がエラーなく通る | CI |
