import type { Env } from '../types'

// 外部 API のベース URL。E2E では env で上書きしてモックサーバーへ向ける。
export const redditWwwBase = (env: Env): string => env.REDDIT_WWW_BASE || 'https://www.reddit.com'
export const redditOauthBase = (env: Env): string => env.REDDIT_OAUTH_BASE || 'https://oauth.reddit.com'
export const deeplApiBase = (env: Env): string => env.DEEPL_API_BASE || 'https://api-free.deepl.com'
export const claudeApiBase = (env: Env): string => env.CLAUDE_API_BASE || 'https://api.anthropic.com'
