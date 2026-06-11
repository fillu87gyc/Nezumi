# E2E テスト

チケット #1–#18 の全機能を、本物のスタックで end-to-end に検証する。

## 実行方法

```bash
pnpm install
pnpm build                              # E2E はビルド済み client/dist を配信する
npx playwright install chromium         # 初回のみ
pnpm test:e2e
```

すべての起動（モックサーバー・D1 マイグレーション・wrangler dev）は Playwright の
`webServer` が自動で行う。手動でサーバーを立てる必要はない。

## アーキテクチャ

```
┌──────────────┐         ┌──────────────────────────────────────┐
│  Playwright   │ ──────► │  wrangler dev --local (127.0.0.1:8787) │
│  (Chromium)   │         │   ・Hono Workers（本物のコード）         │
└──────────────┘         │   ・KV / D1 = miniflare の実 SQLite     │
                          │   ・client/dist（ビルド済み PWA）配信    │
                          └──────────────┬───────────────────────┘
                                         │ fetch（REDDIT_*_BASE 等で向き先を変更）
                                         ▼
                          ┌──────────────────────────────────────┐
                          │  モック外部 API (127.0.0.1:9377)        │
                          │   ・Reddit www / oauth（主目的）         │
                          │   ・DeepL / Claude（API キー不要化）      │
                          │   ・テスト用画像配信・呼び出し統計         │
                          └──────────────────────────────────────┘
```

### モックの境界（何をモックし、何をしないか）

| レイヤー | 扱い |
|---|---|
| React クライアント | **本物**（`pnpm build` の成果物をそのまま配信） |
| Hono Workers | **本物**（`wrangler dev --local` = workerd 実行） |
| KV / D1 | **本物**（miniflare が動かす実 SQLite。マイグレーション適用済み） |
| Service Worker / PWA | **本物**（Chromium 上で実登録・オフライン検証） |
| Reddit API | **モック**（`e2e/mock/server.mjs`。OAuth 認可・トークン交換・フィード・コメント・未読を再現） |
| DeepL / Claude API | **モック**（同サーバーに同居） |

> **DeepL / Claude もモックする理由**: どちらも API キーが必要な有料外部 SaaS で、
> CI から実呼び出しすると非決定的・有料・キー管理が必要になる。Reddit と同じ
> 「外部世界」境界としてフェイクし、アプリ自身のスタックは一切モックしない。

> **D1 と Docker について**: D1 は Cloudflare 専用 DB で公式の Docker イメージが存在しない。
> ローカルの実体は miniflare が管理する **本物の SQLite** であり、`wrangler dev --local` が
> Docker の代わりに本物の D1 エンジンを提供する。E2E は毎回 `e2e/.wrangler-state` を
> 破棄 → マイグレーション適用 → ログイン後に `wrangler d1 execute` でフィルター設定を
> シードし、サーバーサイドフィルタリング（#16/#17）を実データで検証している。

### 外部 API の向き先変更

`src/lib/endpoints.ts` が env（`REDDIT_WWW_BASE` / `REDDIT_OAUTH_BASE` /
`DEEPL_API_BASE` / `CLAUDE_API_BASE`）を読み、未設定なら本番 URL を返す。
E2E では `e2e/scripts/start-worker.mjs` が `--var` でモックサーバーへ向ける。
本番デプロイでは何も設定しなければ従来どおり。

## テスト設計

- **直列実行（workers: 1）**: KV キャッシュ・D1・モック統計を共有するため。
  実行時間より決定性とカバレッジを優先する。
- **KV キャッシュ（`cache:{URL}`、60s TTL）対策**: API テストは `limit` 値を
  テストごとに変えて URL を分け、キャッシュ干渉を防ぐ。
- **セットアップ（`auth.setup.ts`）**: モック Reddit 経由の実 OAuth フローでログインし、
  storageState を保存。その後 D1 に alice のフィルター設定（NG ワード FILTERME・
  minScore 5・NSFW 非表示）をシードする。セットアップ中はフィードを fail させ、
  シード前のレスポンスが KV にキャッシュされるのを防いでいる。
- **fixture**: `e2e/mock/fixtures.mjs` の 7 投稿のうち 3 件（NG ワード・低スコア・NSFW）が
  alice にはフィルターされる設計。画像 2 枚（OCR 用テキスト入り / テキストなし）は
  `e2e/fixtures/*.png`。

## 機能カタログ（スクリーンショット・アーティファクト）

各テストは `capture()` / `recordApi()`（`e2e/helpers/report.ts`）で証跡を残し、
テスト終了時に `e2e/artifacts/` へギャラリーを生成する:

- `index.html` — 機能ごとのスクリーンショット + API 証跡（**どんな機能があるか一発で分かる**）
- `FEATURES.md` — 同内容の Markdown 版
- `screenshots/*.png` / `api/*.json`

GitHub Actions（`.github/workflows/e2e.yml`）は毎回これを **`feature-catalog`
アーティファクト**としてアップロードする。

## カバレッジ対応表

| チケット | 検証内容 | テスト |
|---|---|---|
| #1/#2 | 起動・設定（wrangler dev が全テストの前提） | webServer 起動自体 |
| #3 | OAuth 認可リダイレクト・state 検証・Cookie 属性・トークン自動リフレッシュ・ログアウト | `auth.setup.ts`, `50-api-auth`, `51-api-feed` |
| #4 | 未認証 401・改ざん JWT 401 | `50-api-auth` |
| #5 | home / r/:sub / subreddits / post 詳細の正規化 | `51-api-feed` |
| #6 | KV キャッシュ X-Cache MISS→HIT | `51-api-feed` |
| #7 | ログイン画面・フィード UI・無限スクロール・エラー表示・モバイル幅 | `auth.setup.ts`, `10-feed-ui` |
| #8 | 単体/バッチ翻訳・キャッシュ・空文字 | `52-api-translate` |
| #9 | フィード自動翻訳（titleJa/selftextJa・translate=false） | `51-api-feed`, `10-feed-ui`, `30-settings` |
| #10 | TextSwipe（スワイプ・ドット・ラベル） | `10-feed-ui` |
| #11 | 画像翻訳 API（OCR・キャッシュ・hasText false・画像取得失敗 400） | `53-api-image-notify` |
| #12 | ImageSwipe（スピナー・翻訳オーバーレイ・再呼び出しなし） | `20-image-swipe` |
| #13 | manifest・SW 登録・オフライン表示 | `40-pwa` |
| #14 | Push 購読保存・未読取得・Cron Trigger（`--test-scheduled`） | `53-api-image-notify` |
| #15 | sw.js に push/notificationclick ハンドラが含まれる・購読フロー | `40-pwa`, `30-settings` |
| #16/#17 | D1 シード設定によるサーバーサイドフィルタ（ユーザー単位・再ログイン耐性） | `51-api-feed`, `10-feed-ui` |
| #18 | 設定画面（トグル・スライダー・NG ワード・永続化・ログアウト） | `30-settings` |

### 既知のカバレッジ制約

- **実プッシュ配信（#15 AC-2/3/4）**: headless ブラウザはプッシュサービスに接続できないため、
  通知の実表示・クリック遷移は E2E 対象外。代わりに「ビルド済み sw.js にハンドラが含まれる」
  「購読 API が動く」「Cron が未読をポーリングする」ことを検証している。
- **設定画面のフィルター値はサーバーに同期されない**: 設定 CRUD API（#23）が未実装のため、
  UI の NSFW/スコア設定は localStorage 止まり。D1 フィルターは E2E が直接シードして検証している。
  #23 実装時に UI 経由の E2E に置き換えること。
