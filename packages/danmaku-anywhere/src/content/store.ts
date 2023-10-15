import { create } from 'zustand'

interface Toast {
  info: (message: string, duration?: number) => void
  success: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
}

export interface StoreState {
  isOpen: boolean
  message: string
  severity: 'success' | 'info' | 'warning' | 'error'
  duration: number
  key: any
  open: () => void
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
}
export const useToast = create<StoreState>((set, get) => ({
  isOpen: false,
  message: '',
  severity: 'info',
  duration: 3000,
  key: 0,
  open: () => {
    set({ isOpen: true, key: Date.now() })
  },
  close: () => {
    set({ isOpen: false })
  },
  show: ({ message, duration = 3000, severity = 'info' }) => {
    set({ message, severity, duration })
    get().open()
  },
  toast: {
    info: (message, duration) => {
      get().show({ message, duration })
      get().open()
    },
    success: (message, duration) => {
      get().show({ message, duration, severity: 'success' })
      get().open()
    },
    warning: (message, duration) => {
      get().show({ message, duration, severity: 'warning' })
      get().open()
    },
    error: (message, duration) => {
      get().show({ message, duration, severity: 'error' })
      get().open()
    },
  },
}))
