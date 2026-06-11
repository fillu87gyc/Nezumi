import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  defaultLanguage: 'ja' | 'en'
  autoTranslate: boolean
  translateImages: boolean
  translateComments: boolean
  minScore: number
  minComments: number
  filterNsfw: boolean
  ngWords: string[]
  pushEnabled: boolean
  setAutoTranslate: (v: boolean) => void
  setTranslateImages: (v: boolean) => void
  setTranslateComments: (v: boolean) => void
  setMinScore: (v: number) => void
  setMinComments: (v: number) => void
  setFilterNsfw: (v: boolean) => void
  addNgWord: (word: string) => void
  removeNgWord: (word: string) => void
  setPushEnabled: (v: boolean) => void
  setDefaultLanguage: (v: 'ja' | 'en') => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultLanguage: 'ja',
      autoTranslate: true,
      translateImages: true,
      translateComments: false,
      minScore: 0,
      minComments: 0,
      filterNsfw: false,
      ngWords: [],
      pushEnabled: false,
      setAutoTranslate: (v) => set({ autoTranslate: v }),
      setTranslateImages: (v) => set({ translateImages: v }),
      setTranslateComments: (v) => set({ translateComments: v }),
      setMinScore: (v) => set({ minScore: v }),
      setMinComments: (v) => set({ minComments: v }),
      setFilterNsfw: (v) => set({ filterNsfw: v }),
      addNgWord: (word) =>
        set((s) => ({ ngWords: s.ngWords.includes(word) ? s.ngWords : [...s.ngWords, word] })),
      removeNgWord: (word) =>
        set((s) => ({ ngWords: s.ngWords.filter((w) => w !== word) })),
      setPushEnabled: (v) => set({ pushEnabled: v }),
      setDefaultLanguage: (v) => set({ defaultLanguage: v }),
    }),
    { name: 'nezumi-settings' }
  )
)
