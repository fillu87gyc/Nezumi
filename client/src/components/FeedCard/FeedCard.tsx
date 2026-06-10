import type { Post } from '../../../../src/types'
import TextSwipe from '../TextSwipe/TextSwipe'
import ImageSwipe from '../ImageSwipe/ImageSwipe'
import './FeedCard.css'

interface Props {
  post: Post
}

function formatTime(utc: number): string {
  const diff = Date.now() / 1000 - utc
  if (diff < 60) return '今'
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`
  return `${Math.floor(diff / 86400)}日前`
}

export default function FeedCard({ post }: Props) {
  return (
    <article className="feed-card">
      <div className="card-meta">
        <span className="subreddit">r/{post.subreddit}</span>
        <span className="separator">·</span>
        <span className="author">u/{post.author}</span>
        <span className="separator">·</span>
        <span className="time">{formatTime(post.createdAt)}</span>
        {post.nsfw && <span className="badge nsfw">NSFW</span>}
        {post.flair && <span className="badge flair">{post.flair}</span>}
      </div>

      <div className="card-title">
        {post.titleJa ? (
          <TextSwipe original={post.title} translated={post.titleJa} />
        ) : (
          <h2>{post.title}</h2>
        )}
      </div>

      {post.preview && (
        <div className="card-image">
          <ImageSwipe imageUrl={post.preview} postId={post.id} />
        </div>
      )}

      {post.selftext && (
        <div className="card-body">
          {post.selftextJa ? (
            <TextSwipe original={post.selftext} translated={post.selftextJa} />
          ) : (
            <p className="selftext">{post.selftext.slice(0, 280)}</p>
          )}
        </div>
      )}

      <div className="card-actions">
        <span className="score">▲ {post.score.toLocaleString()}</span>
        <span className="comments">💬 {post.numComments.toLocaleString()}</span>
        <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="reddit-link">
          Reddit で開く
        </a>
      </div>
    </article>
  )
}
