# TICKET-014: Web Push 通知バックエンド + Cron Trigger

| 項目 | 値 |
|---|---|
| フェーズ | Phase 4 |
| ブランチ | `feat/phase4-push-backend` |
| 優先度 | P2 |
| 依存 | #5 |

---

## 背景・目的

Reddit の未読通知（返信・DM）をプッシュ通知で届ける。  
Cloudflare Workers の Cron Trigger で 15 分ごとにポーリングし、**新着**の未読があれば Web Push を送信する
（リアルタイムではなく最大 15 分遅延のポーリング方式）。

> **実装上の注意**: `web-push` npm パッケージは Node の crypto に依存しており **Workers では動作しない**。
> VAPID 署名（ES256）とペイロード暗号化（RFC 8291 / aes128gcm）は WebCrypto ベースの
> Workers 対応ライブラリ（例: `@block65/webcrypto-web-push`）を使用する。
> ライブラリ選定は DEPENDENCY_POLICY（7日ルール・ライセンス）に従うこと。

---

## スコープ

### In Scope
- `POST /api/notify/subscribe` — Push subscription を KV に保存
- `GET /api/notify/unread` — Reddit 未読通知を取得
- `sendPushNotifications(env)` — Push 送信（Cron から呼ばれる）
- `sendWebPush(sub, payload, env)` — VAPID 署名 + ペイロード暗号化を含む**完全実装**（骨格・TODO のまま残さない）
- 通知済みメッセージの重複送信防止
- `wrangler.toml` の Cron Trigger 設定
- `src/index.ts` の `scheduled` ハンドラ追加

### Out of Scope
- Service Worker でのプッシュ受信（→ #15）
- VAPID 鍵生成の詳細手順（docs/setup/ に記載）

---

## タスク

- [ ] `src/routes/notify.ts` を作成（認証は #4 の index.ts 集中適用でかかる）
- [ ] `POST /api/notify/subscribe` を実装
  - `req.json()` で PushSubscription オブジェクトを受け取り KV `push-sub:{userId}` に保存（90 日 TTL）
- [ ] `GET /api/notify/unread` を実装
  - `https://oauth.reddit.com/message/unread` を呼び出し
  - `{ messages, count }` を返す（メッセージフィールド: id, subject, author, body, createdAt, type）
- [ ] `sendPushNotifications(env)` 関数を実装
  - KV の `push-sub:` プレフィックスを `list()` して購読中ユーザーを列挙（D1 には依存しない）
  - 各ユーザーの Reddit 未読を取得
  - **KV `notify-last:{userId}` に前回通知済みの最新メッセージ ID を保存し、それより新しい未読があるときだけ送信する**（同じ未読を 15 分ごとに再通知しない）
  - 送信後に `notify-last:{userId}` を更新
  - エラーは個別にキャッチし、1 ユーザーの失敗で全体を止めない
  - 410 Gone（購読失効）を受けたら `push-sub:{userId}` を削除する
- [ ] `sendWebPush(sub, payload, env)` を Workers 対応ライブラリで実装（VAPID 鍵は `env.VAPID_PRIVATE_KEY` / `env.VAPID_PUBLIC_KEY`。`Env` 型にも追加）
- [ ] `wrangler.toml` に `[triggers] crons = ["*/15 * * * *"]` を追加
- [ ] `src/index.ts` を `export default { fetch: app.fetch, scheduled }` 形式に変更
- [ ] `src/index.ts` に `app.route('/api/notify', notify)` を追加

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | `POST /api/notify/subscribe` が `{ ok: true }` を返し KV に保存される | ローカルテスト |
| AC-2 | `GET /api/notify/unread` が未読メッセージ一覧を返す | ローカルテスト（実 Reddit 認証） |
| AC-3 | `wrangler.toml` に Cron Trigger が設定されている | コードレビュー |
| AC-4 | `scheduled` ハンドラが `sendPushNotifications` を呼び出す（`wrangler dev --test-scheduled` + `curl /__scheduled` で確認） | ローカル実行 |
| AC-5 | `sendWebPush` で実際にブラウザへ通知が届く（スタブでなく E2E） | 実機確認 |
| AC-6 | 未読を放置したまま Cron が 2 回実行されても、同じメッセージの通知は 1 回しか送られない | ユニットテスト（notify-last の比較ロジック） |
| AC-7 | Push 送信失敗が処理全体を止めない（try/catch で個別処理） | コードレビュー |
| AC-8 | `tsc --noEmit` がエラーなく通る | CI |

---

## VAPID 設定手順（`docs/setup/VAPID.md` に記載）

```bash
# VAPID 鍵ペア生成
npx web-push generate-vapid-keys

# シークレットとして設定
wrangler secret put VAPID_PRIVATE_KEY
wrangler secret put VAPID_PUBLIC_KEY
```

---

## 備考

- このチケットの工数は #15 と合わせて Phase 4 の過半を占める。Push が不要だと判断した場合は
  #14/#15 ごとスコープから外してよい（PWA 化(#13)単体でも Phase 4 のマイルストーンの大半は満たせる）
