import { create } from 'zustand'

import { createSelectors } from '@/common/createSelectors'

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
  key: number
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

const useToastBase = create<ToastStoreState>((set, get) => ({
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
}))

export const useToast = createSelectors(useToastBase)
