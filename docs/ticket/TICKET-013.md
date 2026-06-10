# TICKET-013: vite-plugin-pwa + Workbox キャッシュ設定

| 項目 | 値 |
|---|---|
| Vite | v8 |
| フェーズ | Phase 4 |
| ブランチ | `feat/phase4-pwa-config` |
| 優先度 | P1 |
| 依存 | #7 |

---

## 背景・目的

アプリをホーム画面に追加可能にし、オフライン時にキャッシュ済みフィードを閲覧できるようにする。  
`vite-plugin-pwa` と Workbox でプレキャッシュ + ランタイムキャッシュを設定する。

---

## スコープ

### In Scope
- `client/vite.config.ts` の PWA 設定（manifest・Workbox）
- `public/manifest.json` の作成
- PWA アイコン（192px・512px・512px maskable）のプレースホルダー配置
- `client/src/sw.ts` の骨格（プッシュ受信は → #15）

### Out of Scope
- Web Push バックエンド（→ #14）
- プッシュ通知の受信処理（→ #15）

---

## タスク

- [ ] `client/vite.config.ts` に `VitePWA` 設定を追加（Vite v8 の `defineConfig` を使用）
  ```typescript
  VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'Nezumi — Reddit JP',
      short_name: 'Nezumi',
      description: '日本語翻訳付きRedditクライアント',
      theme_color: '#ff4500',
      background_color: '#0d0d0f',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      icons: [ /* 192, 512, 512-maskable */ ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      runtimeCaching: [
        { urlPattern: /\/api\/feed/, handler: 'NetworkFirst',
          options: { cacheName: 'api-feed-cache', expiration: { maxEntries: 50, maxAgeSeconds: 3600 }, networkTimeoutSeconds: 5 } },
        { urlPattern: /\.(jpg|jpeg|png|webp|gif)$/, handler: 'CacheFirst',
          options: { cacheName: 'image-cache', expiration: { maxEntries: 200, maxAgeSeconds: 86400 } } }
      ]
    }
  })
  ```
- [ ] `client/public/icons/` にプレースホルダー PNG を配置（192.png, 512.png, 512-maskable.png）
- [ ] `client/src/sw.ts` に `cleanupOutdatedCaches` + `precacheAndRoute` の骨格を追加
- [ ] `client/vite.config.ts` の `build.outDir` を `'../client/dist'` に設定

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | `npm run build` 後に `client/dist/sw.js` が生成される | ビルド確認 |
| AC-2 | Chrome DevTools の Application タブで「インストール可能」バナーが表示される | ブラウザ確認 |
| AC-3 | ネットワークをオフラインにしても直近のフィードページが表示される | DevTools → オフライン |
| AC-4 | `X-Cache: HIT` のキャッシュ応答がフィード API にある | DevTools Network |
| AC-5 | `manifest.json` に `name`, `theme_color`, `icons` が正しく含まれる | ブラウザ確認 |
| AC-6 | `tsc --noEmit` がエラーなく通る | CI |

---

## 備考

- アイコンは開発中はプレースホルダー PNG で問題ない（Phase 6 で正式アイコンに差し替え）
- `devOptions: { enabled: true }` を設定し、dev サーバーでも SW が動作するようにする
