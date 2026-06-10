import { useState } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { subscribePushNotifications } from '../../hooks/usePushNotification'
import './Settings.css'

export default function Settings() {
  const {
    autoTranslate, setAutoTranslate,
    translateImages, setTranslateImages,
    translateComments, setTranslateComments,
    minScore, setMinScore,
    minComments, setMinComments,
    filterNsfw, setFilterNsfw,
    ngWords, addNgWord, removeNgWord,
    pushEnabled, setPushEnabled,
  } = useSettingsStore()

  const [ngInput, setNgInput] = useState('')

  const handleAddNgWord = () => {
    const word = ngInput.trim()
    if (word) {
      addNgWord(word)
      setNgInput('')
    }
  }

  const handlePushToggle = async (v: boolean) => {
    if (v) {
      const success = await subscribePushNotifications()
      setPushEnabled(success)
    } else {
      setPushEnabled(false)
    }
  }

  return (
    <div className="settings">
      <h2 className="settings-title">設定</h2>

      <section className="settings-section">
        <h3 className="section-title">翻訳</h3>
        <label className="toggle-row">
          <span>自動翻訳</span>
          <input type="checkbox" checked={autoTranslate} onChange={(e) => setAutoTranslate(e.target.checked)} />
        </label>
        <label className="toggle-row">
          <span>画像翻訳</span>
          <input type="checkbox" checked={translateImages} onChange={(e) => setTranslateImages(e.target.checked)} />
        </label>
        <label className="toggle-row">
          <span>コメント翻訳</span>
          <input type="checkbox" checked={translateComments} onChange={(e) => setTranslateComments(e.target.checked)} />
        </label>
      </section>

      <section className="settings-section">
        <h3 className="section-title">フィルター</h3>
        <label className="toggle-row">
          <span>NSFW 非表示</span>
          <input type="checkbox" checked={filterNsfw} onChange={(e) => setFilterNsfw(e.target.checked)} />
        </label>
        <div className="slider-row">
          <span>最低スコア: {minScore}</span>
          <input
            type="range" min={0} max={1000} step={10}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          />
        </div>
        <div className="slider-row">
          <span>最低コメント数: {minComments}</span>
          <input
            type="range" min={0} max={200} step={1}
            value={minComments}
            onChange={(e) => setMinComments(Number(e.target.value))}
          />
        </div>
      </section>

      <section className="settings-section">
        <h3 className="section-title">NGワード</h3>
        <div className="ng-input-row">
          <input
            className="ng-input"
            type="text"
            placeholder="NGワードを入力..."
            value={ngInput}
            onChange={(e) => setNgInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNgWord()}
          />
          <button className="ng-add-btn" onClick={handleAddNgWord}>追加</button>
        </div>
        <div className="ng-tags">
          {ngWords.map((word) => (
            <span key={word} className="ng-tag">
              {word}
              <button className="ng-remove" onClick={() => removeNgWord(word)}>×</button>
            </span>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h3 className="section-title">通知</h3>
        <label className="toggle-row">
          <span>プッシュ通知</span>
          <input type="checkbox" checked={pushEnabled} onChange={(e) => handlePushToggle(e.target.checked)} />
        </label>
      </section>

      <section className="settings-section">
        <h3 className="section-title">アカウント</h3>
        <a href="/auth/logout" className="logout-btn" onClick={async (e) => {
          e.preventDefault()
          await fetch('/auth/logout', { method: 'POST' })
          window.location.href = '/'
        }}>
          ログアウト
        </a>
      </section>
    </div>
  )
}
