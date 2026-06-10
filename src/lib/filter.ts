import type { Post, FilterSettings } from '../types'

export function filterPosts(posts: Post[], settings: FilterSettings): Post[] {
  return posts.filter((post) => {
    if (post.score < settings.minScore) return false
    if (post.numComments < settings.minComments) return false
    if (settings.filterNsfw && post.nsfw) return false

    for (const ng of settings.ngWords) {
      const targets: string[] = []
      if (ng.target === 'title' || ng.target === 'all') targets.push(post.title)
      if (ng.target === 'body' || ng.target === 'all') targets.push(post.selftext)

      for (const text of targets) {
        if (!text) continue
        let matched = false
        try {
          if (ng.matchType === 'contains') {
            matched = text.toLowerCase().includes(ng.word.toLowerCase())
          } else if (ng.matchType === 'exact') {
            matched = text === ng.word
          } else if (ng.matchType === 'regex') {
            matched = new RegExp(ng.word, 'i').test(text)
          }
        } catch {
          // invalid regex - skip
        }
        if (matched) return false
      }
    }

    return true
  })
}
