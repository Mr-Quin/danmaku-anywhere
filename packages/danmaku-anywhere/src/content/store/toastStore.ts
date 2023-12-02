import { DanDanAnime } from '@danmaku-anywhere/danmaku-engine'
import { create } from 'zustand'

interface Toast {
  info: (message: string, duration?: number) => void
  success: (message: string, duration?: number) => void
  warn: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
}

interface ToastStoreState {
  isOpen: boolean
  message: string
  severity: 'success' | 'info' | 'warning' | 'error'
  duration: number
  key: any
  close: () => void
  show: ({
    message,
    duration,
    severity,
  }: {
    message: string
    duration?: number
    severity?: 'success' | 'info' | 'warning' | 'error'
  }) => void
  toast: Toast
  isAnimePopupOpen: boolean
  popupAnimes: DanDanAnime[]
  openAnimePopup: (animes: DanDanAnime[]) => void
  closeAnimePopup: () => void
}

export const useToast = create<ToastStoreState>((set, get) => ({
  isOpen: false,
  message: '',
  severity: 'info',
  duration: 3000,
  key: 0,
  close: () => {
    set({ isOpen: false })
  },
  show: ({ message, duration = 3000, severity = 'info' }) => {
    set({ message, severity, duration, isOpen: true, key: Date.now() })
  },
  toast: {
    info: (message, duration) => {
      get().show({ message, duration })
    },
    success: (message, duration) => {
      get().show({ message, duration, severity: 'success' })
    },
    warn: (message, duration) => {
      get().show({ message, duration, severity: 'warning' })
    },
    error: (message, duration) => {
      get().show({ message, duration, severity: 'error' })
    },
  },
  isAnimePopupOpen: false,
  popupAnimes: [],
  openAnimePopup: (animes) => {
    set({ isAnimePopupOpen: true, popupAnimes: animes })
  },
  closeAnimePopup: () => {
    set({ isAnimePopupOpen: false, popupAnimes: [] })
  },
}))
