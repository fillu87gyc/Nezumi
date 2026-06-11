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
}

export interface Variables {
  userId: string
  userName: string
}

export interface Post {
  id: string
  title: string
  author: string
  subreddit: string
  score: number
  numComments: number
  url: string
  permalink: string
  selftext: string
  thumbnail?: string
  preview?: string
  isVideo: boolean
  media?: unknown
  flair?: string
  createdAt: number
  nsfw: boolean
  spoiler: boolean
  stickied: boolean
  titleJa?: string
  selftextJa?: string
}

export interface Comment {
  id: string
  author: string
  body: string
  score: number
  createdAt: number
  replies: Comment[]
  depth: number
}

export interface ImageTranslateResult {
  hasText: boolean
  originalText: string
  translatedText: string
  textRegions: { original: string; translated: string }[]
}

export interface FilterSettings {
  ngWords: { word: string; matchType: 'contains' | 'exact' | 'regex'; target: 'all' | 'title' | 'body' }[]
  minScore: number
  minComments: number
  filterNsfw: boolean
}
