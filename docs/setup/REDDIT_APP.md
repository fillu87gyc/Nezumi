# Reddit アプリ申請手順

## 1. Reddit アプリを作成

1. https://www.reddit.com/prefs/apps にアクセス
2. 「create another app...」をクリック
3. 以下を入力:
   - **name**: Nezumi
   - **type**: web app
   - **redirect uri**: `http://localhost:8787/auth/callback`（本番は `https://nezumi.example.com/auth/callback`）
4. 「create app」をクリック

## 2. 認証情報を取得

作成後に表示される:
- **client_id**: アプリ名の下に表示される文字列
- **client_secret**: "secret" フィールド

## 3. 必要な OAuth2 スコープ

```
read identity mysubreddits subscribe vote submit privatemessages
```

## 4. シークレット設定

```bash
wrangler secret put REDDIT_CLIENT_ID
wrangler secret put REDDIT_CLIENT_SECRET
```
