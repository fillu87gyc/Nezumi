import { useRef, useState } from 'react'
import './TextSwipe.css'

interface Props {
  original: string
  translated: string
  className?: string
}

export default function TextSwipe({ original, translated, className }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setActiveIndex(index)
  }

  return (
    <div className={`text-swipe ${className ?? ''}`}>
      <div className="text-swipe-track" ref={containerRef} onScroll={handleScroll}>
        <div className="text-swipe-panel translated">
          <span className="lang-label">🇯🇵 日本語</span>
          <p>{translated}</p>
        </div>
        <div className="text-swipe-panel original">
          <span className="lang-label">🇺🇸 Original</span>
          <p>{original}</p>
        </div>
      </div>
      <div className="text-swipe-dots">
        {[0, 1].map((i) => (
          <span key={i} className={`dot ${activeIndex === i ? 'active' : ''}`} />
        ))}
      </div>
    </div>
  )
}
