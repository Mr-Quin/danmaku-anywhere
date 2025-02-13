import { create } from 'zustand'

import { createSelectors } from '@/common/utils/createSelectors'

interface ToastOptions {
  duration?: number
  actionFn?: () => void
  actionLabel?: string
}

type Severity = 'success' | 'info' | 'warning' | 'error'

interface Notification {
  message: string
  severity: Severity
  duration?: number
  actionFn?: () => void
  actionLabel?: string
  key: string
  open: boolean
  paused: boolean
}

interface Toast {
  info: (message: string, options?: ToastOptions) => void
  success: (message: string, options?: ToastOptions) => void
  warn: (message: string, options?: ToastOptions) => void
  error: (message: string, options?: ToastOptions) => void
}

interface ToastStoreState {
  notifications: Notification[]
  // Add a new notification to the list
  enqueue: (
    notification: Omit<Notification, 'key' | 'open' | 'position' | 'paused'>
  ) => void
  // Mark the notification as closed without removing it from the list
  close: (key: string) => void
  // Remove the notification from the list
  dequeue: (key: string) => void
  pause: (key: string) => void
  unpause: (key: string) => void
  toast: Toast
}

const toastStore = create<ToastStoreState>((set, get) => ({
  notifications: [],
  close: (key) => {
    const notifications = get().notifications.map((n) => {
      if (n.key === key) {
        return { ...n, open: false }
      }
      return n
    })
    set({ notifications })
  },
  pause: (key) => {
    set({
      notifications: get().notifications.map((n) => {
        if (n.key === key) {
          return { ...n, paused: true }
        }
        return n
      }),
    })
  },
  unpause: (key) => {
    set({
      notifications: get().notifications.map((n) => {
        if (n.key === key) {
          return { ...n, paused: false }
        }
        return n
      }),
    })
  },
  dequeue: (key) => {
    set({ notifications: get().notifications.filter((n) => n.key !== key) })
  },
  enqueue: ({
    message,
    duration = 3500,
    severity = 'info',
    actionFn,
    actionLabel,
  }) => {
    set({
      notifications: [
        ...get().notifications,
        {
          message,
          severity,
          duration,
          actionFn,
          actionLabel,
          key: `${performance.now()}-${Math.random()}`,
          open: true,
          paused: false,
        },
      ],
    })
  },
  toast: {
    info: (message, options) => {
      get().enqueue({ message, severity: 'info', ...options })
    },
    success: (message, options) => {
      get().enqueue({ message, severity: 'success', ...options })
    },
    warn: (message, options) => {
      get().enqueue({ message, severity: 'warning', ...options })
    },
    error: (message, options) => {
      get().enqueue({ message, severity: 'error', ...options })
    },
  },
}))

export const useToast = createSelectors(toastStore)
