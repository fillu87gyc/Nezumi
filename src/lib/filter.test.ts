import { describe, it, expect } from 'vitest'
import { filterPosts } from './filter'
import type { Post, FilterSettings } from '../types'

const makePost = (overrides: Partial<Post> = {}): Post => ({
  id: 'test',
  title: 'Test Post',
  author: 'testuser',
  subreddit: 'test',
  score: 100,
  numComments: 10,
  url: 'https://reddit.com/r/test/comments/test',
  permalink: 'https://reddit.com/r/test/comments/test',
  selftext: '',
  isVideo: false,
  createdAt: 1700000000,
  nsfw: false,
  spoiler: false,
  stickied: false,
  ...overrides,
})

const emptySettings: FilterSettings = {
  ngWords: [],
  minScore: 0,
  minComments: 0,
  filterNsfw: false,
}

describe('filterPosts', () => {
  it('returns all posts when settings are empty', () => {
    const posts = [makePost(), makePost({ id: 'test2' })]
    expect(filterPosts(posts, emptySettings)).toHaveLength(2)
  })

  it('filters posts below minScore', () => {
    const posts = [makePost({ score: 5 }), makePost({ id: 'test2', score: 100 })]
    const result = filterPosts(posts, { ...emptySettings, minScore: 10 })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('test2')
  })

  it('filters posts below minComments', () => {
    const posts = [makePost({ numComments: 2 }), makePost({ id: 'test2', numComments: 20 })]
    const result = filterPosts(posts, { ...emptySettings, minComments: 5 })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('test2')
  })

  it('filters nsfw posts when filterNsfw is true', () => {
    const posts = [makePost({ nsfw: true }), makePost({ id: 'test2', nsfw: false })]
    const result = filterPosts(posts, { ...emptySettings, filterNsfw: true })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('test2')
  })

  it('filters posts with ngWord (contains)', () => {
    const posts = [makePost({ title: 'Hello World' }), makePost({ id: 'test2', title: 'Foo Bar' })]
    const result = filterPosts(posts, {
      ...emptySettings,
      ngWords: [{ word: 'world', matchType: 'contains', target: 'title' }],
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('test2')
  })

  it('filters posts with ngWord (exact match)', () => {
    const posts = [makePost({ title: 'Hello World' }), makePost({ id: 'test2', title: 'World' })]
    const result = filterPosts(posts, {
      ...emptySettings,
      ngWords: [{ word: 'World', matchType: 'exact', target: 'title' }],
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('test')
  })

  it('exact match does not filter partial matches', () => {
    const posts = [makePost({ title: 'Hello World Full' })]
    const result = filterPosts(posts, {
      ...emptySettings,
      ngWords: [{ word: 'World', matchType: 'exact', target: 'title' }],
    })
    expect(result).toHaveLength(1)
  })

  it('filters posts with ngWord (regex)', () => {
    const posts = [makePost({ title: 'Hello World 123' }), makePost({ id: 'test2', title: 'Foo Bar' })]
    const result = filterPosts(posts, {
      ...emptySettings,
      ngWords: [{ word: '\\d+', matchType: 'regex', target: 'title' }],
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('test2')
  })

  it('target:title does not filter body ngWords', () => {
    const posts = [makePost({ selftext: 'banned word here' })]
    const result = filterPosts(posts, {
      ...emptySettings,
      ngWords: [{ word: 'banned', matchType: 'contains', target: 'title' }],
    })
    expect(result).toHaveLength(1)
  })

  it('does not crash on invalid regex', () => {
    const posts = [makePost()]
    const result = filterPosts(posts, {
      ...emptySettings,
      ngWords: [{ word: '[invalid', matchType: 'regex', target: 'title' }],
    })
    expect(result).toHaveLength(1)
  })
})
