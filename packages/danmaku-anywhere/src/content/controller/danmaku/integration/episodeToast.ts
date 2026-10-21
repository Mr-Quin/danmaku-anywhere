import type {
  Severity,
  ToastOptions,
} from '@/common/components/Toast/toastStore'
import { useToast } from '@/common/components/Toast/toastStore'
import type { EpisodeRun, EpisodeRuns } from './episodeRuns'

export const EPISODE_TOAST_ID = 'integration-episode'
export const PROGRESS_DELAY_MS = 1500

type ResultOptions = Pick<ToastOptions, 'actionFn' | 'actionLabel'>

// Progress only shows after a delay, so a fast match shows just its result,
// which replaces the progress in place. Calls from a run that is no longer
// current are ignored.
export class EpisodeToast {
  private timer: ReturnType<typeof setTimeout> | undefined
  private showingProgress = false

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
    }, PROGRESS_DELAY_MS)
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
    useToast.getState().enqueue({
      ...options,
      severity,
      message,
      id: EPISODE_TOAST_ID,
    })
  }

  dismiss(run: EpisodeRun) {
    if (!run.isCurrent()) {
      return
    }
    this.close()
  }

  private close() {
    this.clearTimer()
    this.showingProgress = false
    useToast.getState().toast.dismiss(EPISODE_TOAST_ID)
  }

  private showProgress(message: string) {
    this.showingProgress = true
    useToast.getState().enqueue({
      severity: 'info',
      message,
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
