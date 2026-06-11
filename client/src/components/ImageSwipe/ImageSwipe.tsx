import { useRef, useState } from 'react'
import { apiFetch } from '../../api/client'
import type { ImageTranslateResult } from '../../../../src/api-types'
import './ImageSwipe.css'

interface Props {
  imageUrl: string
  postId: string
}

export default function ImageSwipe({ imageUrl, postId }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [result, setResult] = useState<ImageTranslateResult | null>(null)
  const [loading, setLoading] = useState(false)
  const fetched = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleScroll = async () => {
    const el = containerRef.current
    if (!el) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setActiveIndex(index)

    if (index === 1 && !fetched.current) {
      fetched.current = true
      setLoading(true)
      try {
        const data = await apiFetch<ImageTranslateResult>('/api/image-translate/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl, postId }),
        })
        setResult(data)
      } catch {
        setResult({ hasText: false, originalText: '', translatedText: '', textRegions: [] })
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="image-swipe">
      <div className="image-swipe-track" ref={containerRef} onScroll={handleScroll}>
        <div className="image-swipe-panel">
          <img src={imageUrl} alt="" loading="lazy" decoding="async" className="swipe-image" />
          <div className="swipe-hint">← スワイプで翻訳</div>
        </div>
        <div className="image-swipe-panel overlay-panel">
          <img src={imageUrl} alt="" loading="lazy" decoding="async" className="swipe-image bg-image" />
          <div className="overlay-content">
            {loading && <div className="spinner" />}
            {!loading && result && result.hasText && (
              <div className="text-regions">
                {result.textRegions.map((r, i) => (
                  <div key={i} className="text-card">
                    <p className="trans-text">{r.translated}</p>
                    <p className="orig-text">{r.original}</p>
                  </div>
                ))}
              </div>
            )}
            {!loading && result && !result.hasText && (
              <div className="no-text">テキストが見つかりませんでした</div>
            )}
          </div>
        </div>
      </div>
      <div className="swipe-dots">
        {[0, 1].map((i) => (
          <span key={i} className={`dot ${activeIndex === i ? 'active' : ''}`} />
        ))}
      </div>
    </div>
  )
}
