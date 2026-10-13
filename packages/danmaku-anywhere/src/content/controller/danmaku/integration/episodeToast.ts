import type {
  Severity,
  ToastOptions,
} from '@/common/components/Toast/toastStore'
import { useToast } from '@/common/components/Toast/toastStore'
import type { EpisodeRun, EpisodeRuns } from './episodeRuns'

export const EPISODE_TOAST_ID = 'integration-episode'
export const PROGRESS_DELAY_MS = 1500

type ResultOptions = Pick<ToastOptions, 'actionFn' | 'actionLabel'>

export interface ToastSink {
  show: (severity: Severity, message: string, options: ToastOptions) => void
  dismiss: (id: string) => void
}

/**
 * The one toast that tells the user what automatic matching is doing for the
 * current episode run. Progress only shows once a run has worked for a while,
 * so a fast match shows nothing but its result; the result then replaces the
 * progress toast in place. Anything a run that is no longer current asks for
 * is ignored.
 */
export class EpisodeToast {
  private timer: ReturnType<typeof setTimeout> | undefined
  private showingProgress = false

  constructor(
    private readonly sink: ToastSink,
    private readonly delayMs = PROGRESS_DELAY_MS
  ) {}

  // Stopping drops any progress, since no run will finish it.
  follow(runs: EpisodeRuns) {
    const unsubscribe = runs.subscribe((current) => {
      this.clearTimer()
      // A new run swaps the visible progress for its own, so only an ending
      // session takes it down.
      if (current === undefined) {
        this.dropProgress()
      }
    })
    return () => {
      unsubscribe()
      this.clearTimer()
      this.dropProgress()
    }
  }

  private dropProgress() {
    if (this.showingProgress) {
      this.close()
    }
  }

  // Progress already on screen, for example from the previous episode or from
  // AI parsing, is swapped right away instead of being left up while the delay
  // runs.
  progress(run: EpisodeRun, message: string) {
    if (!run.isCurrent()) {
      return
    }
    this.clearTimer()
    if (this.showingProgress) {
      this.showProgress(message)
      return
    }
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.showProgress(message)
    }, this.delayMs)
  }

  report(
    run: EpisodeRun,
    severity: Severity,
    message: string,
    options: ResultOptions = {}
  ) {
    if (!run.isCurrent()) {
      return
    }
    this.clearTimer()
    this.showingProgress = false
    this.sink.show(severity, message, { ...options, id: EPISODE_TOAST_ID })
  }

  // Closes the toast, for when the outcome is shown somewhere else.
  dismiss(run: EpisodeRun) {
    if (!run.isCurrent()) {
      return
    }
    this.close()
  }

  private close() {
    this.clearTimer()
    this.showingProgress = false
    this.sink.dismiss(EPISODE_TOAST_ID)
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
