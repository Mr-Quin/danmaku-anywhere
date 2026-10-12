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
 * The one toast that tells the user what automatic matching is doing for the
 * current episode. Progress only shows once matching has run for a while, so a
 * fast match shows nothing but its result; the result then replaces the
 * progress toast in place.
 */
export class EpisodeToast {
  private timer: ReturnType<typeof setTimeout> | undefined
  private showingProgress = false

  constructor(
    private readonly sink: ToastSink,
    private readonly delayMs = PROGRESS_DELAY_MS
  ) {}

  // Starts work on an episode. Progress already on screen, for example from
  // the previous episode or from AI parsing, is swapped right away instead of
  // being left up while the delay runs.
  start(progressMessage: string) {
    this.clearTimer()
    if (this.showingProgress) {
      this.showProgress(progressMessage)
      return
    }
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.showProgress(progressMessage)
    }, this.delayMs)
  }

  succeed(message: string, options: ResultOptions = {}) {
    this.finish('success', message, options)
  }

  fail(message: string, options: ResultOptions = {}) {
    this.finish('error', message, options)
  }

  warn(message: string, options: ResultOptions = {}) {
    this.finish('warning', message, options)
  }

  // Closes the toast, for when the outcome is shown somewhere else.
  dismiss() {
    this.clearTimer()
    this.showingProgress = false
    this.sink.dismiss(EPISODE_TOAST_ID)
  }

  // Drops pending or visible progress but leaves a finished result alone.
  cancel() {
    this.clearTimer()
    if (this.showingProgress) {
      this.dismiss()
    }
  }

  private showProgress(message: string) {
    this.showingProgress = true
    this.sink.show('info', message, {
      id: EPISODE_TOAST_ID,
      duration: null,
      loading: true,
    })
  }

  private finish(severity: Severity, message: string, options: ResultOptions) {
    this.clearTimer()
    this.showingProgress = false
    this.sink.show(severity, message, { ...options, id: EPISODE_TOAST_ID })
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

export const episodeToast = new EpisodeToast(toastStoreSink)
