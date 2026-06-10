# TICKET-021: エラーハンドリング + ローディング UI

| 項目 | 値 |
|---|---|
| フェーズ | Phase 6 |
| ブランチ | `feat/phase6-error-handling` |
| 優先度 | P2 |
| 依存 | #7 |

---

## 背景・目的

ネットワークエラー・API エラー・レンダリングエラーをユーザーフレンドリーに処理し、  
クラッシュや白画面を防ぐ。

---

## スコープ

### In Scope
- `ErrorBoundary` コンポーネント
- フィードの空状態・エラー状態 UI
- API エラー（4xx/5xx）のトースト通知
- `client/src/api/client.ts` のエラーハンドリング強化

### Out of Scope
- バックエンドのエラーログ収集（Cloudflare Analytics は標準で有効）

---

## タスク

- [ ] `client/src/components/ErrorBoundary.tsx` を作成
  - `getDerivedStateFromError` でエラー検知
  - フォールバック UI: 「読み込みに失敗しました」+ 「再試行」ボタン
  - `retry` ボタンで `setState({ hasError: false })` してリセット
- [ ] `client/src/api/client.ts` を更新
  - 4xx/5xx レスポンスで `Error` を throw
  - 429 の場合は `RateLimitError` をカスタム throw（`retryAfter` フィールド付き）
  - **Cloudflare Access セッション切れの検知**: API 呼び出しが JSON でないレスポンス
    （Access のログインページ HTML / IdP へのリダイレクト）を返した場合は `window.location.reload()` で
    ページ全体を再読み込みし、Access の再認証フローに乗せる（放置すると「謎の JSON パースエラー」として表面化する）
- [ ] `client/src/components/Feed/Feed.tsx` のエラー状態 UI
  - `useInfiniteQuery` の `isError` 時に「フィード取得に失敗しました」+ 「再試行」ボタン
  - `isFetching` 中にスケルトンローダーを表示（既存実装の強化）
- [ ] トースト通知コンポーネント（軽量、外部ライブラリ不要）
  - 右下固定、3 秒後に自動消去
  - エラー（赤）・成功（緑）・情報（青）の3タイプ
- [ ] `App.tsx` を `<ErrorBoundary>` でラップ
- [ ] 翻訳エラー時（DeepL/Claude 失敗）は元テキストをそのまま表示し、エラーバッジを表示

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | ネットワークをオフラインにするとエラー UI が表示され、オンラインに戻すと「再試行」で復帰できる | ブラウザ確認 |
| AC-2 | コンポーネント内で例外が発生しても白画面にならず ErrorBoundary が表示される | ブラウザ確認（エラー投入） |
| AC-3 | 翻訳 API が失敗しても元テキストが表示される | ブラウザ確認（API を無効化） |
| AC-4 | 429 エラー時に「レート制限に達しました。{N秒後}に再試行してください」トーストが表示される | ブラウザ確認 |
| AC-5 | トーストが 3 秒後に自動で消える | ブラウザ確認 |
| AC-6 | Access セッション切れ状態で API を叩くとページがリロードされ再認証に遷移する（クラッシュ・無限ループしない） | ブラウザ確認（Access Cookie を削除して再現） |
| AC-7 | `tsc --noEmit` がエラーなく通る | CI |
