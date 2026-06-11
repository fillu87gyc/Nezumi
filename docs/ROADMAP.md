# Nezumi — 開発ロードマップ

## 概要

Hono on Cloudflare Workers をバックエンド、React PWA をフロントエンドとする Reddit 独自クライアント。  
全体を 7 フェーズ・24 PR に分割し、各フェーズ末に動作確認可能なマイルストーンを置く。

**前提**: 利用者は開発者本人 1 人。全エンドポイントは Cloudflare Access（メール認証）の背後に置く（→ #2, #4）。

---

## フェーズ一覧

| フェーズ | 内容 | PR 数 | 期間目安 |
|---|---|---|---|
| Phase 0 | 環境構築・設計 | 2 | Week 1 |
| Phase 1 | Reddit OAuth2 + 基本フィード | 5 | Week 2–3 |
| Phase 2 | テキスト翻訳・投稿詳細 | 4 | Week 4–5 |
| Phase 3 | 画像翻訳 + スワイプ UI | 2 | Week 5–6 |
| Phase 4 | PWA 化・オフライン・通知 | 3 | Week 7 |
| Phase 5 | フィルタリング・カスタマイズ | 4 | Week 8–9 |
| Phase 6 | 最適化・Polish | 4 | Week 10+ |

---

## Phase 0: 環境構築・設計（Week 1）

### マイルストーン
`wrangler dev` でローカル Workers が起動し、`vite dev` でフロントエンドが表示される。

| チケット | タイトル | ブランチ |
|---|---|---|
| [#1](ticket/TICKET-001.md) | プロジェクト初期化（Hono + Vite + PWA） | `feat/phase0-project-init` |
| [#2](ticket/TICKET-002.md) | wrangler.toml・環境変数・Reddit API 申請手順 | `feat/phase0-wrangler-config` |

---

## Phase 1: Reddit OAuth2 + 基本フィード（Week 2–3）

### マイルストーン
Reddit アカウントでログインし、ホームフィードが実際の投稿データで表示される。

| チケット | タイトル | ブランチ |
|---|---|---|
| [#3](ticket/TICKET-003.md) | OAuth2 認可コードフロー実装（Workers） | `feat/phase1-oauth2` |
| [#4](ticket/TICKET-004.md) | 認証ミドルウェア + JWT セッション管理 + Access JWT 検証 | `feat/phase1-auth-middleware` |
| [#5](ticket/TICKET-005.md) | フィード・投稿詳細 API エンドポイント | `feat/phase1-feed-api` |
| [#6](ticket/TICKET-006.md) | KV キャッシュミドルウェア | `feat/phase1-kv-cache` |
| [#7](ticket/TICKET-007.md) | React 基本フィード UI（Feed / FeedCard） | `feat/phase1-feed-ui` |

---

## Phase 2: テキスト翻訳・投稿詳細（Week 4–5）

### マイルストーン
フィードのタイトルと本文が日本語で表示され、スワイプで原文に切り替えられる。投稿詳細とコメントが閲覧できる。

| チケット | タイトル | ブランチ |
|---|---|---|
| [#8](ticket/TICKET-008.md) | DeepL 翻訳プロキシ API（単体・バッチ） | `feat/phase2-deepl-api` |
| [#9](ticket/TICKET-009.md) | フィード取得時の自動翻訳統合 | `feat/phase2-feed-translate` |
| [#10](ticket/TICKET-010.md) | TextSwipe コンポーネント + FeedCard 統合 | `feat/phase2-text-swipe` |
| [#24](ticket/TICKET-024.md) | 投稿詳細画面（コメント表示） | `feat/phase2-post-detail` |

---

## Phase 3: 画像翻訳 + スワイプ UI（Week 5–6）

### マイルストーン
投稿画像をスワイプすると Claude Vision で OCR + 翻訳されたテキストが表示される。

| チケット | タイトル | ブランチ |
|---|---|---|
| [#11](ticket/TICKET-011.md) | 画像翻訳エンドポイント（Claude Vision OCR） | `feat/phase3-image-translate-api` |
| [#12](ticket/TICKET-012.md) | ImageSwipe コンポーネント | `feat/phase3-image-swipe` |

---

## Phase 4: PWA 化・オフライン・通知（Week 7）

### マイルストーン
ホーム画面に追加可能で、オフライン時にキャッシュ済みフィードを表示できる。返信があると（最大 15 分遅れで）プッシュ通知が届く。

| チケット | タイトル | ブランチ |
|---|---|---|
| [#13](ticket/TICKET-013.md) | vite-plugin-pwa + Workbox キャッシュ設定 | `feat/phase4-pwa-config` |
| [#14](ticket/TICKET-014.md) | Web Push 通知バックエンド + Cron Trigger | `feat/phase4-push-backend` |
| [#15](ticket/TICKET-015.md) | Service Worker プッシュ受信・通知クリック処理 | `feat/phase4-service-worker` |

> Push 通知（#14/#15）は Phase 4 の中で最も工数が重い。優先度 P2 のため、不要と判断すればこの 2 枚はスキップしてよい。

---

## Phase 5: フィルタリング・カスタマイズ（Week 8–9）

### マイルストーン
NGワード・最低スコア・NSFW フィルターが機能し、設定が D1 に永続化される。

| チケット | タイトル | ブランチ |
|---|---|---|
| [#16](ticket/TICKET-016.md) | D1 スキーマ設計 + マイグレーション | `feat/phase5-d1-schema` |
| [#23](ticket/TICKET-023.md) | 設定 CRUD API（フィルター設定・NGワード） | `feat/phase5-settings-api` |
| [#17](ticket/TICKET-017.md) | 投稿フィルタリングロジック（Workers） | `feat/phase5-filter-logic` |
| [#18](ticket/TICKET-018.md) | 設定画面 UI（翻訳・フィルター・NGワード） | `feat/phase5-settings-ui` |

---

## Phase 6: 最適化・Polish（Week 10+）

### マイルストーン
仮想スクロールで大量投稿を快適に閲覧でき、OCR レート制限で API コストが安全に管理される。

| チケット | タイトル | ブランチ |
|---|---|---|
| [#19](ticket/TICKET-019.md) | 仮想スクロール + 画像遅延読み込み | `feat/phase6-virtual-scroll` |
| [#20](ticket/TICKET-020.md) | OCR トークンバケット レート制限 | `feat/phase6-ocr-rate-limit` |
| [#21](ticket/TICKET-021.md) | エラーハンドリング + ローディング UI | `feat/phase6-error-handling` |
| [#22](ticket/TICKET-022.md) | デプロイスクリプト + CI/CD 設定 | `feat/phase6-deploy` |

---

## 依存関係グラフ

各チケットの「依存」欄と一致させている。同じ段のチケットは並行して進められる。

```
#1 ──► #2 ──► #3 ──► #4 ──┬─► #5 ──┬─► #6
                          │        ├─► #7 ──► #10（#9 にも依存）──► #24
                          │        └─► #14
                          ├─► #8 ──► #9
                          └─► #11 ──► #12（#10 にも依存）
                                      #11 ──► #20

#2 ──► #16 ──► #23 ─┬─► #17（#16 依存）
                    └─► #18（#15, #17, #23 依存）

#7 ──► #13 ──► #15（#14 にも依存）
#7 ──► #19, #21
#1, #2 ──► #22
```

---

## 実装優先順位

```
Week 1:   #1, #2        — 環境構築（vitest 含む）+ Access 設定
Week 2:   #3, #4        — 認証（Reddit OAuth + Access JWT 検証）
Week 3:   #5, #6, #7    — フィード表示
Week 4:   #8, #9, #10   — テキスト翻訳
Week 5:   #24, #11      — 投稿詳細 / 画像翻訳 API
Week 6:   #12           — 画像スワイプ UI
Week 7:   #13, #14, #15 — PWA（#14/#15 はスキップ可）
Week 8:   #16, #23, #17 — フィルタリング
Week 9:   #18           — 設定 UI
Week 10+: #19–#22       — 最適化・Polish
```
