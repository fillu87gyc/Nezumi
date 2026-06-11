# VAPID 鍵ペア設定

## 鍵ペア生成

```bash
npx web-push generate-vapid-keys
```

## シークレットとして設定

```bash
wrangler secret put VAPID_PRIVATE_KEY
wrangler secret put VAPID_PUBLIC_KEY
```

## クライアント環境変数

`client/.env` に以下を追加:
```
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
```
