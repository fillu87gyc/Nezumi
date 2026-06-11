import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import Feed from './components/Feed/Feed'
import Settings from './components/Settings/Settings'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastContainer, showToast } from './components/Toast/Toast'
import { RateLimitError } from './api/client'
import './App.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000 },
  },
  mutationCache: undefined,
})

queryClient.getQueryCache().config.onError = (err) => {
  if (err instanceof RateLimitError) {
    showToast(`レート制限に達しました。${err.retryAfter} 秒後に再試行してください。`, 'error')
  }
}

type Page = 'feed' | 'settings'

export default function App() {
  const [page, setPage] = useState<Page>('feed')
  // session Cookie は httpOnly で document.cookie に現れないため、
  // サーバーが併設する非 httpOnly の logged_in Cookie で判定する
  const [isLoggedIn] = useState<boolean>(() => {
    return document.cookie.includes('logged_in=')
  })

  if (!isLoggedIn) {
    return (
      <>
        <div className="login-screen">
          <div className="login-card">
            <h1>Nezumi</h1>
            <p>広告ゼロ・アルゴリズムゼロの Reddit JP クライアント</p>
            <a href="/auth/login" className="login-btn">
              Reddit でログイン
            </a>
          </div>
        </div>
        <ToastContainer />
      </>
    )
  }

  return (
    <ErrorBoundary>
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
            <ErrorBoundary>
              {page === 'feed' && <Feed />}
              {page === 'settings' && <Settings />}
            </ErrorBoundary>
          </main>
        </div>
        <ToastContainer />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
