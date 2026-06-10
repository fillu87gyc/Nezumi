# チケットレビュー記録（2026-06-10）

全 22 チケットの批判的レビューで見つかった問題と、その対応。  
前提: **利用者は開発者本人 1 人**、全エンドポイントは **Cloudflare Access** の背後に置く。

## 致命的問題と対応

| # | 問題 | 対応 |
|---|---|---|
| C1 | #6 の KV キャッシュが URL 単位キーで、`/home`・`/subreddits` のユーザー固有データを共有していた | 単独利用 + Access 前提では実害なしと判断し、前提条件を #6 に明記。到達制御として #2 に `workers_dev = false` + Access 設定、#4 に Access JWT 検証を追加 |
| C2 | #17 は D1 のフィルタ設定を読むが、書き込む API がどこにも存在せず、#18 は localStorage のみだった | **#23（設定 CRUD API）を新設**。#18 をサーバー同期方式に書き換え、NGワードの型を D1 スキーマ（matchType/target）に合わせた |
| C3 | #11（Phase 3）と #20（Phase 6）が循環依存していた | #11 の依存から #20 を削除（#20 → #11 の一方向に修正） |
| C4 | #14（Phase 4）が #16（Phase 5）の D1 `users` テーブルに依存していた | #14 を KV の `push-sub:` プレフィックス list 方式に変更し、D1 依存を解消 |
| C5 | Web Push 送信（VAPID 署名）が「TODO 骨格」のままどのチケットでも実装されず、Phase 4 マイルストーンが達成不能だった | #14 で Workers 対応ライブラリによる完全実装を必須化（`web-push` npm は Workers で動かない旨も明記）。重いと判断した場合のスキップ条件も記載 |

## 主要な技術的修正

- **#3**: Reddit OAuth2 は PKCE 非対応のため、タイトル・内容を認可コードフローに修正。refresh_token に必須の `duration=permanent` を追加。トークン KV の 30 日 TTL を撤廃（勝手にログアウトする）。logout で KV トークンも削除。JWT/Cookie の有効期限（30 日）を明記
- **#2**: OAuth スコープを最小化（`subscribe vote submit` を削除 — 対応機能が存在しない）。`compatibility_date` を着手時点の日付に。Cron 設定の二重定義を #14 に一本化
- **#4**: `requireAuth` の各ルート個別適用をやめ、`app.use('/api/*', ...)` の集中適用に変更（付け忘れ事故防止）。Cloudflare Access JWT（`Cf-Access-Jwt-Assertion`）検証ミドルウェアを追加
- **#6**: スニペット修正（`next()` 後の `c.header()` は無効 → `c.res.headers.set`、エラーレスポンスをキャッシュしない）。KV の `expirationTtl` 最小値 60 秒に合わせて AC を修正
- **#11**: 画像 URL のホスト許可リスト（SSRF 防止）、キャッシュキーに imageUrl ハッシュを追加（ギャラリー投稿の衝突防止）、media_type 判定とサイズ上限を追加
- **#13**: manifest を VitePWA に一本化（public/manifest.json の二重管理を排除）。`cacheableResponse: { statuses: [200] }` で Access ログイン HTML のキャッシュ事故を防止
- **#14**: 「リアルタイム」表現を撤回（最大 15 分遅延）。未読の再通知スパム防止（`notify-last:{userId}` で通知済み ID を管理）。410 Gone での購読クリーンアップ
- **#21**: Access セッション切れ（API が JSON でなく HTML を返す）のハンドリングを追加
- **#22**: Reddit レート制限ミドルウェアをスコープから削除（単独利用 + キャッシュで不要。KV カウンターは同一キー 1 write/秒制限により原理的にも不正確）。pnpm に統一
- **#1**: vitest 導入を Phase 0 に前倒し（従来は最終チケット #22 で導入なのに、#3 以降の AC がユニットテストを要求していた）。npm/pnpm の混在を解消。Wrangler v4 前提に更新

## 新設チケット

- **#23**: 設定 CRUD API（C2 の解消）
- **#24**: 投稿詳細画面 — #5 の `GET /api/feed/post/:postId` を消費する UI が存在しなかった

## ROADMAP

- 依存関係グラフを各チケットの「依存」欄と一致するよう全面修正（旧グラフは実際には存在しない直列依存を描いており、並行可能な作業を不必要に直列化していた）
- 22 PR → 24 PR、#24 を Phase 2、#23 を Phase 5 に配置

## 見送った指摘（記録のみ）

- #10 の国旗ラベル（原文≠英語の場合に 🇺🇸 が不正確）— 実装時の裁量に委ねる
- #19 の「60fps」AC の計測方法が曖昧 — 目標値として許容
- コメント翻訳は全チケットで Out of Scope のまま（#18 から死に設定の `translateComments` トグルは削除済み）
