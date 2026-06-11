import { useState, useCallback, useEffect, useRef } from 'react'
import './Toast.css'

export type ToastType = 'error' | 'success' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

let addToastFn: ((message: string, type: ToastType) => void) | null = null

export function showToast(message: string, type: ToastType = 'info') {
  addToastFn?.(message, type)
}

let nextId = 0

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const t = timers.current.get(id)
    if (t) { clearTimeout(t); timers.current.delete(id) }
  }, [])

  const add = useCallback((message: string, type: ToastType) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])
    const t = setTimeout(() => remove(id), 3000)
    timers.current.set(id, t)
  }, [remove])

  useEffect(() => {
    addToastFn = add
    return () => { addToastFn = null }
  }, [add])

  if (toasts.length === 0) return null

  return (
    <div className="toast-container" role="region" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => remove(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
