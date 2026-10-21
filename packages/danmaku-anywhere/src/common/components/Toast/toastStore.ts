import { create } from 'zustand'

import { createSelectors } from '@/common/utils/createSelectors'

export interface ToastOptions {
  // null keeps the toast until it is replaced or dismissed
  duration?: number | null
  actionFn?: () => void
  actionLabel?: string
  // A later toast with the same id replaces this one in place
  id?: string
  loading?: boolean
}

export type Severity = 'success' | 'info' | 'warning' | 'error'

export interface Notification {
  message: string
  severity: Severity
  duration: number | null
  actionFn?: () => void
  actionLabel?: string
  id?: string
  loading?: boolean
  key: string
  // Bumped when a keyed toast is replaced, so its timer starts over
  revision: number
  open: boolean
  paused: boolean
}

interface Toast {
  info: (message: string, options?: ToastOptions) => void
  success: (message: string, options?: ToastOptions) => void
  warn: (message: string, options?: ToastOptions) => void
  error: (message: string, options?: ToastOptions) => void
  dismiss: (id: string) => void
}

type EnqueueInput = ToastOptions & {
  message: string
  severity?: Severity
}

interface ToastStoreState {
  notifications: Notification[]
  enqueue: (notification: EnqueueInput) => void
  // Mark the notification as closed without removing it from the list
  close: (key: string) => void
  // Remove the notification from the list
  dequeue: (key: string) => void
  pause: (key: string) => void
  unpause: (key: string) => void
  toast: Toast
}

const DEFAULT_DURATION_MS = 3500
const ACTIONABLE_ERROR_DURATION_MS = 10_000

function defaultDuration(severity: Severity, actionFn?: () => void): number {
  if (severity === 'error' && actionFn) {
    return ACTIONABLE_ERROR_DURATION_MS
  }
  return DEFAULT_DURATION_MS
}

function updateWhere(
  notifications: Notification[],
  match: (n: Notification) => boolean,
  update: (n: Notification) => Notification
): Notification[] {
  return notifications.map((n) => {
    if (match(n)) {
      return update(n)
    }
    return n
  })
}

const toastStore = create<ToastStoreState>((set, get) => ({
  notifications: [],
  close: (key) => {
    set({
      notifications: updateWhere(
        get().notifications,
        (n) => n.key === key,
        (n) => ({ ...n, open: false })
      ),
    })
  },
  pause: (key) => {
    set({
      notifications: updateWhere(
        get().notifications,
        (n) => n.key === key,
        (n) => ({ ...n, paused: true })
      ),
    })
  },
  unpause: (key) => {
    set({
      notifications: updateWhere(
        get().notifications,
        (n) => n.key === key,
        (n) => ({ ...n, paused: false })
      ),
    })
  },
  dequeue: (key) => {
    set({ notifications: get().notifications.filter((n) => n.key !== key) })
  },
  enqueue: ({
    message,
    duration,
    severity = 'info',
    actionFn,
    actionLabel,
    id,
    loading,
  }) => {
    const content = {
      message,
      severity,
      duration:
        duration === undefined ? defaultDuration(severity, actionFn) : duration,
      actionFn,
      actionLabel,
      loading,
    }
    const notifications = get().notifications
    const existing =
      id === undefined
        ? undefined
        : notifications.find((n) => n.id === id && n.open)

    if (existing) {
      set({
        notifications: updateWhere(
          notifications,
          (n) => n.key === existing.key,
          (n) => ({ ...n, ...content, revision: n.revision + 1 })
        ),
      })
      return
    }

    set({
      notifications: [
        ...notifications,
        {
          ...content,
          id,
          key: `${performance.now()}-${Math.random()}`,
          revision: 0,
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
    dismiss: (id) => {
      set({
        notifications: updateWhere(
          get().notifications,
          (n) => n.id === id,
          (n) => ({ ...n, open: false })
        ),
      })
    },
  },
}))

export const useToast = createSelectors(toastStore)
