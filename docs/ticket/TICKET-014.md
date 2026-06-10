# TICKET-014: Web Push 通知バックエンド + Cron Trigger

| 項目 | 値 |
|---|---|
| フェーズ | Phase 4 |
| ブランチ | `feat/phase4-push-backend` |
| 優先度 | P2 |
| 依存 | #5 |

---

## 背景・目的

Reddit の未読通知（返信・DM）をプッシュ通知でリアルタイムに届ける。  
Cloudflare Workers の Cron Trigger で 15 分ごとにポーリングし、未読があれば Web Push を送信する。

---

## スコープ

### In Scope
- `POST /api/notify/subscribe` — Push subscription を KV に保存
- `GET /api/notify/unread` — Reddit 未読通知を取得
- `sendPushNotifications(env)` — 全ユーザーへの Push 送信（Cron から呼ばれる）
- `wrangler.toml` の Cron Trigger 設定
- `src/index.ts` の `scheduled` ハンドラ追加

### Out of Scope
- Service Worker でのプッシュ受信（→ #15）
- VAPID 鍵生成の詳細手順（docs/setup/ に記載）

---

## タスク

- [ ] `src/routes/notify.ts` を作成し `requireAuth` を適用
- [ ] `POST /api/notify/subscribe` を実装
  - `req.json()` で PushSubscription オブジェクトを受け取り KV `push-sub:{userId}` に保存（90 日 TTL）
- [ ] `GET /api/notify/unread` を実装
  - `https://oauth.reddit.com/message/unread` を呼び出し
  - `{ messages, count }` を返す（メッセージフィールド: id, subject, author, body, createdAt, type）
- [ ] `sendPushNotifications(env)` 関数を実装
  - D1 から全ユーザー ID 取得
  - KV から push subscription 取得（ない場合スキップ）
  - Reddit 未読が 1 件以上なら `sendWebPush()` を呼び出し
  - エラーは個別にキャッチし、1 ユーザーの失敗で全体を止めない
- [ ] `sendWebPush(sub, payload, env)` のインターフェースを定義（VAPID 実装は TODO コメント付き骨格）
- [ ] `wrangler.toml` に `crons = ["*/15 * * * *"]` を追加
- [ ] `src/index.ts` を `export default { fetch: app.fetch, scheduled }` 形式に変更
- [ ] `src/index.ts` に `app.route('/api/notify', notify)` を追加

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | `POST /api/notify/subscribe` が `{ ok: true }` を返し KV に保存される | ローカルテスト |
| AC-2 | `GET /api/notify/unread` が未読メッセージ一覧を返す | ローカルテスト（実 Reddit 認証） |
| AC-3 | `wrangler.toml` に Cron Trigger が設定されている | コードレビュー |
| AC-4 | `scheduled` ハンドラが `sendPushNotifications` を呼び出す | コードレビュー |
| AC-5 | 1 ユーザーの Push 送信失敗が他のユーザーに影響しない（try/catch で個別処理） | コードレビュー |
| AC-6 | `tsc --noEmit` がエラーなく通る | CI |

---

## VAPID 設定手順（`docs/setup/VAPID.md` に記載）

```bash
# VAPID 鍵ペア生成
npx web-push generate-vapid-keys

# シークレットとして設定
wrangler secret put VAPID_PRIVATE_KEY
wrangler secret put VAPID_PUBLIC_KEY
```
