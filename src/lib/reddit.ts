import type { Post, Comment } from '../types'

export function normalizePost(raw: Record<string, unknown>): Post {
  const data = raw.data as Record<string, unknown>
  const preview = extractPreview(data)
  return {
    id: data.id as string,
    title: data.title as string,
    author: data.author as string,
    subreddit: data.subreddit as string,
    score: (data.score as number) || 0,
    numComments: (data.num_comments as number) || 0,
    url: data.url as string,
    permalink: `https://www.reddit.com${data.permalink}`,
    selftext: (data.selftext as string) || '',
    thumbnail: (data.thumbnail as string) || undefined,
    preview,
    isVideo: (data.is_video as boolean) || false,
    media: data.media,
    flair: (data.link_flair_text as string) || undefined,
    createdAt: data.created_utc as number,
    nsfw: (data.over_18 as boolean) || false,
    spoiler: (data.spoiler as boolean) || false,
    stickied: (data.stickied as boolean) || false,
  }
}

function extractPreview(data: Record<string, unknown>): string | undefined {
  const preview = data.preview as Record<string, unknown> | undefined
  if (!preview) return undefined
  const images = preview.images as Array<Record<string, unknown>> | undefined
  if (!images || images.length === 0) return undefined
  const source = (images[0].source as Record<string, string>) | undefined
  if (!source) return undefined
  return source.url?.replace(/&amp;/g, '&')
}

export function normalizeComments(children: unknown[], depth = 0): Comment[] {
  if (!Array.isArray(children)) return []
  return children
    .filter((child: unknown) => (child as Record<string, unknown>).kind === 't1')
    .map((child: unknown) => {
      const c = child as Record<string, unknown>
      const data = c.data as Record<string, unknown>
      const repliesData = data.replies as Record<string, unknown>
      const replyChildren =
        repliesData?.data
          ? (repliesData.data as Record<string, unknown>).children as unknown[]
          : []
      return {
        id: data.id as string,
        author: data.author as string,
        body: data.body as string,
        score: (data.score as number) || 0,
        createdAt: data.created_utc as number,
        replies: normalizeComments(replyChildren || [], depth + 1),
        depth,
      }
    })
}
