import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSettingsStore } from '../../stores/settingsStore'
import { subscribePushNotifications } from '../../hooks/usePushNotification'
import { apiFetch } from '../../api/client'
import './Settings.css'

interface NgWord {
  id: number
  word: string
  matchType: string
  target: string
}

interface SettingsResponse {
  filter: { minScore: number; minComments: number; filterNsfw: boolean }
  ngWords: NgWord[]
}

export default function Settings() {
  const {
    autoTranslate, setAutoTranslate,
    translateImages, setTranslateImages,
    translateComments, setTranslateComments,
    pushEnabled, setPushEnabled,
  } = useSettingsStore()

  const [ngInput, setNgInput] = useState('')
  const [minScore, setMinScore] = useState(0)
  const [minComments, setMinComments] = useState(0)
  const [filterNsfw, setFilterNsfw] = useState(false)
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiFetch<SettingsResponse>('/api/settings'),
  })

  useEffect(() => {
    if (data) {
      setMinScore(data.filter.minScore)
      setMinComments(data.filter.minComments)
      setFilterNsfw(data.filter.filterNsfw)
    }
  }, [data])

  const filterMutation = useMutation({
    mutationFn: (body: { minScore?: number; minComments?: number; filterNsfw?: boolean }) =>
      apiFetch('/api/settings/filter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })

  const addNgWordMutation = useMutation({
    mutationFn: (word: string) =>
      apiFetch('/api/settings/ng-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })

  const deleteNgWordMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/settings/ng-words/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })

  const handleAddNgWord = () => {
    const word = ngInput.trim()
    if (word) {
      addNgWordMutation.mutate(word)
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
          <input
            type="checkbox"
            checked={filterNsfw}
            onChange={(e) => {
              setFilterNsfw(e.target.checked)
              filterMutation.mutate({ filterNsfw: e.target.checked })
            }}
          />
        </label>
        <div className="slider-row">
          <span>最低スコア: {minScore}</span>
          <input
            type="range" min={0} max={1000} step={10}
            value={minScore}
            onChange={(e) => {
              const v = Number(e.target.value)
              setMinScore(v)
              filterMutation.mutate({ minScore: v })
            }}
          />
        </div>
        <div className="slider-row">
          <span>最低コメント数: {minComments}</span>
          <input
            type="range" min={0} max={200} step={1}
            value={minComments}
            onChange={(e) => {
              const v = Number(e.target.value)
              setMinComments(v)
              filterMutation.mutate({ minComments: v })
            }}
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
          {(data?.ngWords ?? []).map((item) => (
            <span key={item.id} className="ng-tag">
              {item.word}
              <button className="ng-remove" onClick={() => deleteNgWordMutation.mutate(item.id)}>×</button>
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
