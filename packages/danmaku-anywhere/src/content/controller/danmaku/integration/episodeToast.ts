import type {
  Severity,
  ToastOptions,
} from '@/common/components/Toast/toastStore'
import { useToast } from '@/common/components/Toast/toastStore'

export const EPISODE_TOAST_ID = 'integration-episode'
export const PROGRESS_DELAY_MS = 1500

type ResultOptions = Pick<ToastOptions, 'actionFn' | 'actionLabel'>

export interface ToastSink {
  show: (severity: Severity, message: string, options: ToastOptions) => void
  dismiss: (id: string) => void
}

/**
 * One run of automatic matching. It owns the episode toast from start() until
 * it reports a result, is cancelled, or a newer operation starts. Once it has
 * lost the toast every call is ignored, so work that finishes late cannot
 * touch what a newer operation shows.
 */
export interface EpisodeOperation {
  isCurrent: () => boolean
  succeed: (message: string, options?: ResultOptions) => void
  fail: (message: string, options?: ResultOptions) => void
  warn: (message: string, options?: ResultOptions) => void
  // Closes the toast, for when the outcome is shown somewhere else.
  dismiss: () => void
  // Drops pending or visible progress.
  cancel: () => void
}

/**
 * The one toast that tells the user what automatic matching is doing for the
 * current episode. Progress only shows once matching has run for a while, so a
 * fast match shows nothing but its result; the result then replaces the
 * progress toast in place.
 */
export class EpisodeToast {
  private owner: EpisodeOperation | undefined
  private timer: ReturnType<typeof setTimeout> | undefined
  private showingProgress = false

  constructor(
    private readonly sink: ToastSink,
    private readonly delayMs = PROGRESS_DELAY_MS
  ) {}

  // Without a progress message the operation shows only its result. Progress
  // already on screen, for example from the previous episode or from AI
  // parsing, is swapped right away instead of being left up while the delay
  // runs.
  start(progressMessage?: string): EpisodeOperation {
    this.clearTimer()
    const operation: EpisodeOperation = {
      isCurrent: () => this.owner === operation,
      succeed: (message, options) => {
        this.finish(operation, 'success', message, options)
      },
      fail: (message, options) => {
        this.finish(operation, 'error', message, options)
      },
      warn: (message, options) => {
        this.finish(operation, 'warning', message, options)
      },
      dismiss: () => {
        this.dismiss(operation)
      },
      cancel: () => {
        this.cancelOperation(operation)
      },
    }
    this.owner = operation

    if (progressMessage === undefined) {
      return operation
    }
    if (this.showingProgress) {
      this.showProgress(progressMessage)
      return operation
    }
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.showProgress(progressMessage)
    }, this.delayMs)
    return operation
  }

  // Cancels whichever operation is running. A finished result stays up.
  cancel() {
    if (this.owner) {
      this.cancelOperation(this.owner)
    }
  }

  private cancelOperation(operation: EpisodeOperation) {
    if (this.owner !== operation) {
      return
    }
    if (this.showingProgress) {
      this.dismiss(operation)
      return
    }
    this.release()
  }

  private dismiss(operation: EpisodeOperation) {
    if (this.owner !== operation) {
      return
    }
    this.release()
    this.sink.dismiss(EPISODE_TOAST_ID)
  }

  private finish(
    operation: EpisodeOperation,
    severity: Severity,
    message: string,
    options: ResultOptions = {}
  ) {
    if (this.owner !== operation) {
      return
    }
    this.release()
    this.sink.show(severity, message, { ...options, id: EPISODE_TOAST_ID })
  }

  private release() {
    this.clearTimer()
    this.owner = undefined
    this.showingProgress = false
  }

  private showProgress(message: string) {
    this.showingProgress = true
    this.sink.show('info', message, {
      id: EPISODE_TOAST_ID,
      duration: null,
      loading: true,
    })
  }

  private clearTimer() {
    clearTimeout(this.timer)
    this.timer = undefined
  }
}

export const toastStoreSink: ToastSink = {
  show: (severity, message, options) => {
    useToast.getState().enqueue({ severity, message, ...options })
  },
  dismiss: (id) => {
    useToast.getState().toast.dismiss(id)
  },
}
