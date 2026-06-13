export interface Env {
  KV: KVNamespace
  DB: D1Database
  ASSETS: Fetcher
  REDDIT_CLIENT_ID: string
  REDDIT_CLIENT_SECRET: string
  DEEPL_API_KEY: string
  CLAUDE_API_KEY: string
  JWT_SECRET: string
  BASE_URL: string
  ENVIRONMENT: string
  VAPID_PRIVATE_KEY?: string
  VAPID_PUBLIC_KEY?: string
  // E2E テストで外部 API をモックサーバーに向けるための上書き。未設定なら本番 URL。
  REDDIT_WWW_BASE?: string
  REDDIT_OAUTH_BASE?: string
  DEEPL_API_BASE?: string
  CLAUDE_API_BASE?: string
}

export interface Variables {
  userId: string
  userName: string
}

export type { Post, Comment, ImageTranslateResult, FilterSettings } from './api-types'
