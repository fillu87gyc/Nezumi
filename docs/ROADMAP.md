# Nezumi — 開発ロードマップ

## 概要

Hono on Cloudflare Workers をバックエンド、React PWA をフロントエンドとする Reddit 独自クライアント。  
全体を 7 フェーズ・22 PR に分割し、各フェーズ末に動作確認可能なマイルストーンを置く。

---

## フェーズ一覧

| フェーズ | 内容 | PR 数 | 期間目安 |
|---|---|---|---|
| Phase 0 | 環境構築・設計 | 2 | Week 1 |
| Phase 1 | Reddit OAuth2 + 基本フィード | 5 | Week 2–3 |
| Phase 2 | テキスト翻訳 | 3 | Week 4 |
| Phase 3 | 画像翻訳 + スワイプ UI | 2 | Week 5–6 |
| Phase 4 | PWA 化・オフライン・通知 | 3 | Week 7 |
| Phase 5 | フィルタリング・カスタマイズ | 3 | Week 8–9 |
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
| [#3](ticket/TICKET-003.md) | OAuth2 PKCE フロー実装（Workers） | `feat/phase1-oauth2-pkce` |
| [#4](ticket/TICKET-004.md) | 認証ミドルウェア + JWT セッション管理 | `feat/phase1-auth-middleware` |
| [#5](ticket/TICKET-005.md) | フィード・投稿詳細 API エンドポイント | `feat/phase1-feed-api` |
| [#6](ticket/TICKET-006.md) | KV キャッシュミドルウェア | `feat/phase1-kv-cache` |
| [#7](ticket/TICKET-007.md) | React 基本フィード UI（Feed / FeedCard） | `feat/phase1-feed-ui` |

---

## Phase 2: テキスト翻訳（Week 4）

### マイルストーン
フィードのタイトルと本文が日本語で表示され、スワイプで原文に切り替えられる。

| チケット | タイトル | ブランチ |
|---|---|---|
| [#8](ticket/TICKET-008.md) | DeepL 翻訳プロキシ API（単体・バッチ） | `feat/phase2-deepl-api` |
| [#9](ticket/TICKET-009.md) | フィード取得時の自動翻訳統合 | `feat/phase2-feed-translate` |
| [#10](ticket/TICKET-010.md) | TextSwipe コンポーネント + FeedCard 統合 | `feat/phase2-text-swipe` |

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
ホーム画面に追加可能で、オフライン時にキャッシュ済みフィードを表示できる。返信時にプッシュ通知が届く。

| チケット | タイトル | ブランチ |
|---|---|---|
| [#13](ticket/TICKET-013.md) | vite-plugin-pwa + Workbox キャッシュ設定 | `feat/phase4-pwa-config` |
| [#14](ticket/TICKET-014.md) | Web Push 通知バックエンド + Cron Trigger | `feat/phase4-push-backend` |
| [#15](ticket/TICKET-015.md) | Service Worker プッシュ受信・通知クリック処理 | `feat/phase4-service-worker` |

---

## Phase 5: フィルタリング・カスタマイズ（Week 8–9）

### マイルストーン
NGワード・最低スコア・NSFW フィルターが機能し、設定が永続化される。

| チケット | タイトル | ブランチ |
|---|---|---|
| [#16](ticket/TICKET-016.md) | D1 スキーマ設計 + マイグレーション | `feat/phase5-d1-schema` |
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

```
#1 ──► #2 ──► #3 ──► #4 ──► #5 ──► #6
                                     │
                                     ▼
                              #7 ──► #8 ──► #9 ──► #10
                                                    │
                                                    ▼
                                             #11 ──► #12
                                                     │
                                                     ▼
                                              #13, #14, #15
                                                     │
                                                     ▼
                                             #16 ──► #17 ──► #18
                                                             │
                                                             ▼
                                                  #19, #20, #21, #22
```

---

## 実装優先順位

```
Week 1:  #1, #2       — 環境構築
Week 2:  #3, #4       — 認証
Week 3:  #5, #6, #7   — フィード表示
Week 4:  #8, #9, #10  — テキスト翻訳
Week 5:  #11          — 画像翻訳 API
Week 6:  #12          — 画像スワイプ UI
Week 7:  #13, #14, #15 — PWA
Week 8:  #16, #17     — フィルタリング
Week 9:  #18          — 設定 UI
Week 10+: #19–#22     — 最適化・Polish
```
