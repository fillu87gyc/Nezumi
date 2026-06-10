# Nezumi — Reddit JP Client

広告ゼロ・アルゴリズムゼロの Reddit 個人クライアント。  
Hono on Cloudflare Workers をバックエンドとし、React PWA をフロントエンドとする。  
フィードはデフォルト日本語翻訳、画像内テキストも Claude Vision で翻訳可能。

---

## コアコンセプト

- **広告ゼロ・アルゴリズムゼロ** — 自分で定義したフィードだけを表示
- **デフォルト日本語翻訳** — タイトル・本文を DeepL で自動翻訳
- **スワイプ UI** — 左右スワイプで原文 ↔ 翻訳を切り替え
- **画像翻訳** — Claude Vision API で画像内テキストを OCR + 翻訳
- **PWA** — オフライン対応・プッシュ通知・ホーム画面追加
- **エッジ完結** — Cloudflare Workers / KV / D1 のみで動作

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| Frontend | React 18 + Vite v8 + vite-plugin-pwa |
| Backend | Hono on Cloudflare Workers |
| Storage | Cloudflare KV（キャッシュ・トークン）+ D1（ユーザーデータ）|
| 翻訳 | DeepL API（テキスト）+ Claude API vision（画像 OCR + 翻訳）|
| Auth | Reddit OAuth2 PKCE |
| Deploy | Wrangler + Cloudflare Pages |

---

## ディレクトリ構成

```
Nezumi/
├── src/                        # Hono Workers バックエンド
│   ├── index.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── feed.ts
│   │   ├── translate.ts
│   │   ├── image-translate.ts
│   │   └── notify.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── cache.ts
│   │   └── rateLimit.ts
│   ├── lib/
│   │   ├── reddit.ts
│   │   ├── deepl.ts
│   │   ├── claude.ts
│   │   ├── filter.ts
│   │   └── rateLimiter.ts
│   └── types.ts
│
├── client/                     # React PWA フロントエンド
│   ├── src/
│   │   ├── components/
│   │   │   ├── FeedCard/
│   │   │   ├── ImageSwipe/
│   │   │   ├── TextSwipe/
│   │   │   ├── Feed/
│   │   │   ├── PostDetail/
│   │   │   ├── Notification/
│   │   │   └── Settings/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── api/
│   └── vite.config.ts
│
├── migrations/                 # D1 マイグレーション SQL
├── docs/
│   ├── ROADMAP.md
│   └── ticket/                 # PR チケット一覧
├── wrangler.toml
├── package.json
└── tsconfig.json
```

---

## セットアップ

```bash
# ツールバージョン確認・インストール（mise）
mise install

# 依存インストール（ルート + client をまとめて）
pnpm install

# シークレット設定
wrangler secret put REDDIT_CLIENT_ID
wrangler secret put REDDIT_CLIENT_SECRET
wrangler secret put DEEPL_API_KEY
wrangler secret put CLAUDE_API_KEY
wrangler secret put JWT_SECRET

# D1 セットアップ
wrangler d1 create nezumi-db
wrangler d1 migrations apply nezumi-db --local

# KV セットアップ
wrangler kv:namespace create KV
```

## ローカル開発

```bash
# Workers と Vite を別ターミナルで起動
pnpm dev:worker   # wrangler dev --local
pnpm dev:client   # cd client && vite
```

---

## コスト試算（個人利用）

| サービス | 想定使用量 | 費用 |
|---|---|---|
| Cloudflare Workers | 〜10万リクエスト/日 | 無料枠内 |
| Cloudflare KV | 〜10万 reads/日 | 無料枠内 |
| Cloudflare D1 | 〜5万クエリ/日 | 無料枠内 |
| DeepL API | 〜10万文字/月 | 無料枠内 |
| Claude API（Vision） | 月 900 画像（OCR 限定） | 要確認 |
| Reddit API | 100 req/分 | 無料（要申請） |

---

## ロードマップ

詳細は [docs/ROADMAP.md](docs/ROADMAP.md) を参照。

| フェーズ | 内容 | チケット |
|---|---|---|
| Phase 0 | 環境構築・設計 | #1 – #2 |
| Phase 1 | Reddit OAuth2 + 基本フィード | #3 – #7 |
| Phase 2 | テキスト翻訳 | #8 – #10 |
| Phase 3 | 画像翻訳 + スワイプ UI | #11 – #12 |
| Phase 4 | PWA 化・オフライン・通知 | #13 – #15 |
| Phase 5 | フィルタリング・カスタマイズ | #16 – #18 |
| Phase 6 | 最適化・Polish | #19 – #22 |

---

## ライセンス

[MIT](LICENSE)
