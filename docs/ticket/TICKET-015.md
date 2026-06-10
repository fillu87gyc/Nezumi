# TICKET-015: Service Worker プッシュ受信・通知クリック処理

| 項目 | 値 |
|---|---|
| フェーズ | Phase 4 |
| ブランチ | `feat/phase4-service-worker` |
| 優先度 | P2 |
| 依存 | #13, #14 |

---

## 背景・目的

Service Worker でプッシュ通知を受信し、システム通知として表示する。  
通知クリック時にアプリ内の該当ページへ遷移する。

---

## スコープ

### In Scope
- `client/src/sw.ts` の push / notificationclick ハンドラ
- フロントエンドでの Push 購読登録（VAPID 公開鍵を使った `subscribe()`）
- `client/src/hooks/usePushNotification.ts` フック

### Out of Scope
- バックエンドの Push 送信（→ #14）

---

## タスク

- [ ] `client/src/sw.ts` に `push` イベントリスナーを追加
  - `event.data.json()` でペイロードを取得
  - `self.registration.showNotification(title, { body, icon, badge, data, actions })` を呼び出し
  - actions: `[{ action: 'open', title: '開く' }, { action: 'dismiss', title: '閉じる' }]`
- [ ] `client/src/sw.ts` に `notificationclick` イベントリスナーを追加
  - `dismiss` アクションは早期 return
  - 既存ウィンドウがあれば `focus()` + `navigate(url)`
  - なければ `clients.openWindow(url)`
- [ ] `client/src/hooks/usePushNotification.ts` を作成
  - `Notification.permission` チェック → `requestPermission()` → `serviceWorker.ready`
  - `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })`
  - `POST /api/notify/subscribe` に subscription を送信
- [ ] `client/src/components/Settings/` に「プッシュ通知を有効にする」ボタンを追加（#18 と連携）
- [ ] `VITE_VAPID_PUBLIC_KEY` 環境変数を `client/.env.example` に追加

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | 設定画面で通知許可を承認するとシステムダイアログが表示される | ブラウザ確認 |
| AC-2 | バックエンドから Push を送信するとシステム通知が届く | ローカルテスト（`web-push` CLI） |
| AC-3 | 通知の「開く」クリックでアプリが前面に出て該当 URL に遷移する | ブラウザ確認 |
| AC-4 | 通知の「閉じる」クリックで通知が消えアプリ遷移しない | ブラウザ確認 |
| AC-5 | SW 登録に失敗しても画面がクラッシュしない（try/catch） | ブラウザ確認 |
| AC-6 | `tsc --noEmit` がエラーなく通る | CI |
