# TICKET-004: 認証ミドルウェア + JWT セッション管理

| 項目 | 値 |
|---|---|
| フェーズ | Phase 1 |
| ブランチ | `feat/phase1-auth-middleware` |
| 優先度 | P0 |
| 依存 | #3 |

---

## 背景・目的

保護されたエンドポイントに共通の認証チェックを設ける。  
`session` Cookie の JWT を検証し、`userId` / `userName` をコンテキストに注入する。

---

## スコープ

### In Scope
- `src/middleware/auth.ts` — `requireAuth` ミドルウェア
- `src/types.ts` への `Variables` 型追加（`userId`, `userName`）

### Out of Scope
- ルート登録（各ルートファイルで `use('*', requireAuth)` を追加するのは各チケットの責務）

---

## タスク

- [ ] `src/types.ts` に `Variables` インターフェースを追加
  ```typescript
  export interface Variables {
    userId: string
    userName: string
  }
  ```
- [ ] `src/middleware/auth.ts` に `requireAuth` を実装
  - `session` Cookie が存在しない場合 → `401 Unauthorized`
  - `verify(token, env.JWT_SECRET)` が失敗した場合 → `401 Invalid token`
  - 成功時 → `c.set('userId', payload.sub)` / `c.set('userName', payload.name)`
- [ ] `Hono` の型パラメータ `{ Bindings: Env; Variables: Variables }` をすべてのルートに適用する規約を `src/types.ts` コメントに記載

---

## 受入基準

| # | 基準 | 検証方法 |
|---|---|---|
| AC-1 | Cookie なしで保護エンドポイントにアクセスすると `401 {"error":"Unauthorized"}` が返る | ユニットテスト |
| AC-2 | 無効な JWT で `401 {"error":"Invalid token"}` が返る | ユニットテスト |
| AC-3 | 有効な JWT で `c.get('userId')` と `c.get('userName')` が正しい値を返す | ユニットテスト |
| AC-4 | `tsc --noEmit` がエラーなく通る | CI |

---

## 備考

- `hono/factory` の `createMiddleware` を使って型安全なミドルウェアとする
