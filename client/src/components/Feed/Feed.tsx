import { useInfiniteQuery } from '@tanstack/react-query'
import { apiFetch } from '../../api/client'
import FeedCard from '../FeedCard/FeedCard'
import { useIntersection } from '../../hooks/useIntersection'
import { useSettingsStore } from '../../stores/settingsStore'
import type { Post } from '../../../../src/types'
import './Feed.css'

interface FeedResponse {
  posts: Post[]
  after: string | null
}

export default function Feed() {
  const autoTranslate = useSettingsStore((s) => s.autoTranslate)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteQuery({
      queryKey: ['feed', 'home', autoTranslate],
      queryFn: ({ pageParam }) => {
        const params = new URLSearchParams({ translate: String(autoTranslate) })
        if (pageParam) params.set('after', pageParam as string)
        return apiFetch<FeedResponse>(`/api/feed/home?${params}`)
      },
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => lastPage.after || null,
    })

  const sentinelRef = useIntersection(
    () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage()
    },
    [hasNextPage, isFetchingNextPage]
  )

  if (isLoading) {
    return (
      <div className="feed">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton-card" />
        ))}
      </div>
    )
  }

  if (isError) {
    return <div className="feed-error">フィードの読み込みに失敗しました。</div>
  }

  const posts = data?.pages.flatMap((p) => p.posts) ?? []

  return (
    <div className="feed">
      {posts.map((post) => (
        <FeedCard key={post.id} post={post} />
      ))}
      <div ref={sentinelRef} className="sentinel" />
      {isFetchingNextPage && <div className="feed-loading">読み込み中...</div>}
    </div>
  )
}
