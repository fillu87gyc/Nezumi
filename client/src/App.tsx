import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import Feed from './components/Feed/Feed'
import Settings from './components/Settings/Settings'
import './App.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000 },
  },
})

type Page = 'feed' | 'settings'

export default function App() {
  const [page, setPage] = useState<Page>('feed')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return document.cookie.includes('session=')
  })

  if (!isLoggedIn) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>Nezumi</h1>
          <p>広告ゼロ・アルゴリズムゼロの Reddit JP クライアント</p>
          <a href="/auth/login" className="login-btn">
            Reddit でログイン
          </a>
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app">
        <nav className="nav">
          <span className="nav-brand" onClick={() => setPage('feed')}>Nezumi</span>
          <button className={`nav-item ${page === 'feed' ? 'active' : ''}`} onClick={() => setPage('feed')}>
            フィード
          </button>
          <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')}>
            設定
          </button>
        </nav>
        <main className="main">
          {page === 'feed' && <Feed />}
          {page === 'settings' && <Settings />}
        </main>
      </div>
    </QueryClientProvider>
  )
}
