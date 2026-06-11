import { describe, it, expect } from 'vitest'
import { redditWwwBase, redditOauthBase, deeplApiBase, claudeApiBase } from './endpoints'
import type { Env } from '../types'

const emptyEnv = {} as Env

describe('endpoints', () => {
  it('デフォルトで本番 URL を返す', () => {
    expect(redditWwwBase(emptyEnv)).toBe('https://www.reddit.com')
    expect(redditOauthBase(emptyEnv)).toBe('https://oauth.reddit.com')
    expect(deeplApiBase(emptyEnv)).toBe('https://api-free.deepl.com')
    expect(claudeApiBase(emptyEnv)).toBe('https://api.anthropic.com')
  })

  it('env で上書きできる（E2E モックサーバー用）', () => {
    const env = {
      REDDIT_WWW_BASE: 'http://127.0.0.1:9377',
      REDDIT_OAUTH_BASE: 'http://127.0.0.1:9377',
      DEEPL_API_BASE: 'http://127.0.0.1:9377',
      CLAUDE_API_BASE: 'http://127.0.0.1:9377',
    } as Env
    expect(redditWwwBase(env)).toBe('http://127.0.0.1:9377')
    expect(redditOauthBase(env)).toBe('http://127.0.0.1:9377')
    expect(deeplApiBase(env)).toBe('http://127.0.0.1:9377')
    expect(claudeApiBase(env)).toBe('http://127.0.0.1:9377')
  })

  it('空文字はデフォルトにフォールバックする', () => {
    const env = { REDDIT_WWW_BASE: '' } as Env
    expect(redditWwwBase(env)).toBe('https://www.reddit.com')
  })
})
