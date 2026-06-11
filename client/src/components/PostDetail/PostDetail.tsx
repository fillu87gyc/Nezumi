import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../api/client'
import type { Post, Comment } from '../../../../src/api-types'
import TextSwipe from '../TextSwipe/TextSwipe'
import './PostDetail.css'

interface Props {
  postId: string
  onBack: () => void
}

interface PostDetailResponse {
  post: Post
  comments: Comment[]
}

function formatTime(utc: number): string {
  const diff = Date.now() / 1000 - utc
  if (diff < 60) return '今'
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`
  return `${Math.floor(diff / 86400)}日前`
}

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="comment" data-depth={comment.depth} style={{ marginLeft: `${comment.depth * 16}px` }}>
      <div className="comment-meta">
        <span className="comment-author">u/{comment.author}</span>
        <span className="comment-score">▲ {comment.score}</span>
        <span className="comment-time">{formatTime(comment.createdAt)}</span>
      </div>
      <p className="comment-body">{comment.body}</p>
      {comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((r) => <CommentItem key={r.id} comment={r} />)}
        </div>
      )}
    </div>
  )
}

export default function PostDetail({ postId, onBack }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => apiFetch<PostDetailResponse>(`/api/feed/post/${postId}`),
  })

  return (
    <div className="post-detail">
      <button className="back-btn" onClick={onBack}>← 戻る</button>

      {isLoading && (
        <div className="post-detail-loading">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      )}

      {isError && (
        <div className="post-detail-error">
          <p>投稿の読み込みに失敗しました。</p>
        </div>
      )}

      {data && (
        <>
          <article className="post-detail-card">
            <div className="post-detail-meta">
              <span className="subreddit">r/{data.post.subreddit}</span>
              <span className="separator">·</span>
              <span className="author">u/{data.post.author}</span>
              <span className="separator">·</span>
              <span className="time">{formatTime(data.post.createdAt)}</span>
              {data.post.nsfw && <span className="badge nsfw">NSFW</span>}
              {data.post.flair && <span className="badge flair">{data.post.flair}</span>}
            </div>

            <div className="post-detail-title">
              {data.post.titleJa ? (
                <TextSwipe original={data.post.title} translated={data.post.titleJa} />
              ) : (
                <h1>{data.post.title}</h1>
              )}
            </div>

            {data.post.preview && (
              <div className="post-detail-image">
                <img src={data.post.preview} alt={data.post.title} loading="lazy" />
              </div>
            )}

            {data.post.selftext && (
              <div className="post-detail-body">
                {data.post.selftextJa ? (
                  <TextSwipe original={data.post.selftext} translated={data.post.selftextJa} />
                ) : (
                  <p>{data.post.selftext}</p>
                )}
              </div>
            )}

            <div className="post-detail-actions">
              <span className="score">▲ {data.post.score.toLocaleString()}</span>
              <span className="comments-count">💬 {data.post.numComments.toLocaleString()}</span>
              <a href={data.post.permalink} target="_blank" rel="noopener noreferrer" className="reddit-link">
                Reddit で開く
              </a>
            </div>
          </article>

          <section className="comments-section">
            <h2 className="comments-title">コメント ({data.comments.length})</h2>
            {data.comments.length === 0 && (
              <p className="no-comments">コメントはありません。</p>
            )}
            {data.comments.map((c) => <CommentItem key={c.id} comment={c} />)}
          </section>
        </>
      )}
    </div>
  )
}
