import { create } from 'zustand'

import { createSelectors } from '@/common/utils/createSelectors'

interface ToastOptions {
  duration?: number
  actionFn?: () => void
  actionLabel?: string
}

interface Toast {
  info: (message: string, options?: ToastOptions) => void
  success: (message: string, options?: ToastOptions) => void
  warn: (message: string, options?: ToastOptions) => void
  error: (message: string, options?: ToastOptions) => void
}

interface ToastStoreState {
  isOpen: boolean
  message: string
  severity: 'success' | 'info' | 'warning' | 'error'
  actionFn?: () => void
  actionLabel?: string
  duration: number
  key: number
  close: () => void
  show: ({
    message,
    duration,
    severity,
    actionFn,
    actionLabel,
  }: {
    message: string
    duration?: number
    severity?: 'success' | 'info' | 'warning' | 'error'
    actionFn?: () => void
    actionLabel?: string
  }) => void
  unsetAction: () => void
  toast: Toast
}

const toastStore = create<ToastStoreState>((set, get) => ({
  isOpen: false,
  message: '',
  severity: 'info' as const,
  duration: 3000,
  key: 0,
  close: () => {
    set({ isOpen: false })
  },
  show: ({
    message,
    duration = 3000,
    severity = 'info',
    actionFn,
    actionLabel,
  }) => {
    set({
      message,
      severity,
      duration,
      isOpen: true,
      key: Date.now(),
      actionFn,
      actionLabel,
    })
  },
  unsetAction: () => {
    set({ actionFn: undefined, actionLabel: undefined })
  },
  toast: {
    info: (message, options) => {
      get().show({ message, severity: 'info', ...options })
    },
    success: (message, options) => {
      get().show({ message, severity: 'success', ...options })
    },
    warn: (message, options) => {
      get().show({ message, severity: 'warning', ...options })
    },
    error: (message, options) => {
      get().show({ message, severity: 'error', ...options })
    },
  },
}))

export const useToast = createSelectors(toastStore)
