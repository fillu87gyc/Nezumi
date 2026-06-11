import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // sw.ts の push / notificationclick ハンドラを本番 SW に含めるため injectManifest を使う
      // （generateSW だと sw.ts がビルドされず、ランタイムキャッシュとプッシュ受信が乖離する）
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'Nezumi — Reddit JP',
        short_name: 'Nezumi',
        description: '日本語翻訳付きRedditクライアント',
        theme_color: '#ff4500',
        background_color: '#0d0d0f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // ランタイムキャッシュ（NetworkFirst / CacheFirst）は src/sw.ts 側で registerRoute する
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
      '/auth': 'http://localhost:8787',
    },
  },
})
