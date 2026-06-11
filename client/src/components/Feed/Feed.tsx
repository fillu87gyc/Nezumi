import { useRef, useEffect } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { apiFetch, RateLimitError } from '../../api/client'
import FeedCard from '../FeedCard/FeedCard'
import { useSettingsStore } from '../../stores/settingsStore'
import { showToast } from '../Toast/Toast'
import type { Post } from '../../../../src/api-types'
import './Feed.css'

interface FeedResponse {
  posts: Post[]
  after: string | null
}

export default function Feed() {
  const autoTranslate = useSettingsStore((s) => s.autoTranslate)
  const parentRef = useRef<HTMLDivElement>(null)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useInfiniteQuery({
      queryKey: ['feed', 'home', autoTranslate],
      queryFn: ({ pageParam }) => {
        const params = new URLSearchParams({ translate: String(autoTranslate) })
        if (pageParam) params.set('after', pageParam as string)
        return apiFetch<FeedResponse>(`/api/feed/home?${params}`)
      },
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => lastPage.after || null,
      retry: (count, err) => {
        if (err instanceof RateLimitError) return false
        return count < 1
      },
    })

  const posts = data?.pages.flatMap((p) => p.posts) ?? []

  const rowVirtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  useEffect(() => {
    const last = virtualItems[virtualItems.length - 1]
    if (last && last.index >= posts.length - 3 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [virtualItems, hasNextPage, isFetchingNextPage, fetchNextPage, posts.length])

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
    return (
      <div className="feed-error">
        <p>フィードの読み込みに失敗しました。</p>
        <button className="retry-btn" onClick={() => { void refetch() }}>再試行</button>
      </div>
    )
  }

  return (
    <div ref={parentRef} className="feed feed-virtual">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const post = posts[virtualItem.index]
          if (!post) return null
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <FeedCard post={post} />
            </div>
          )
        })}
      </div>
      {isFetchingNextPage && <div className="feed-loading">読み込み中...</div>}
    </div>
  )
}
