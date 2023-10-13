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
  onOpen: () => void
  onClose: () => void
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
export const useToast = create<StoreState>((set) => ({
  isOpen: false,
  message: '',
  severity: 'info',
  duration: 3000,
  onOpen: () => {
    set({ isOpen: true })
  },
  onClose: () => {
    set({ isOpen: false })
  },
  show: ({ message, duration = 3000, severity = 'info' }) => {
    set({ isOpen: true, message, severity, duration })
  },
  toast: {
    info: (message, duration) => {
      set({ isOpen: true, message, severity: 'info', duration })
    },
    success: (message, duration) => {
      set({ isOpen: true, message, severity: 'success', duration })
    },
    warning: (message, duration) => {
      set({ isOpen: true, message, severity: 'warning', duration })
    },
    error: (message, duration) => {
      set({ isOpen: true, message, severity: 'error', duration })
    },
  },
}))
