import type { Frame, FrameFailure, FrameStrategy } from './frameStrategy'
import {
  frameStrategyFactory,
  type IFrameStrategyFactory,
} from './frameStrategyFactory'

// Every attempt loads the media again, hence the short retry list.
export const RECOVERY_RETRY_DELAYS_MS = [2_000, 6_000]

export type ReadOutcome =
  | { status: 'frame'; frame: Frame }
  | { status: 'pending' }
  | { status: 'disabled'; failure: FrameFailure }

export interface FrameSourceDeps {
  createStrategy: IFrameStrategyFactory
  now: () => number
}

const defaultDeps: FrameSourceDeps = {
  createStrategy: frameStrategyFactory(),
  now: () => performance.now(),
}

/**
 * Answers "where does the next frame come from?" for one video. Classifies the
 * video once into a frame strategy and keeps it until the src changes or the
 * source is reset, retrying a recoverable failure with backoff and reporting a
 * terminal one as disabled.
 */
export class FrameSource {
  private strategy: FrameStrategy | null = null
  // src the strategy was classified against; a change forces a re-classify.
  private resolvedSrc: string | null = null
  private failure: FrameFailure | null = null
  private attempts = 0
  private nextAttemptAt = 0
  // Bumped on reset so a strategy that outlives it cannot install its result.
  private generation = 0
  private readonly deps: FrameSourceDeps

  constructor(
    private readonly log: (message: string) => void,
    deps: Partial<FrameSourceDeps> = {}
  ) {
    this.deps = { ...defaultDeps, ...deps }
  }

  // isStale aborts a read whose async work outlived the capture loop.
  async read(
    video: HTMLVideoElement,
    isStale: () => boolean
  ): Promise<ReadOutcome> {
    if (this.resolvedSrc !== null && this.resolvedSrc !== video.currentSrc) {
      this.reset()
    }
    if (this.failure) {
      return { status: 'disabled', failure: this.failure }
    }
    let strategy = this.strategy
    if (!strategy) {
      if (this.deps.now() < this.nextAttemptAt) {
        return { status: 'pending' }
      }
      const plan = this.deps.createStrategy(video)
      if (plan.kind === 'pending') {
        return { status: 'pending' }
      }
      if (plan.kind === 'failed') {
        return this.onFailure(plan.failure)
      }
      strategy = plan.strategy
      this.strategy = strategy
      this.resolvedSrc = video.currentSrc
    }
    const generation = this.generation
    const result = await strategy.acquire()
    if (generation !== this.generation) {
      strategy.dispose()
      return { status: 'pending' }
    }
    if (isStale()) {
      this.disposeStrategy()
      return { status: 'pending' }
    }
    if (result.status === 'pending') {
      return { status: 'pending' }
    }
    if (result.status === 'frame') {
      return { status: 'frame', frame: result.frame }
    }
    return this.onFailure(result.failure)
  }

  reset(): void {
    this.generation++
    this.disposeStrategy()
    this.failure = null
    this.attempts = 0
    this.nextAttemptAt = 0
  }

  private onFailure(failure: FrameFailure): ReadOutcome {
    this.disposeStrategy()
    if (failure.kind === 'protected') {
      this.failure = failure
      return { status: 'disabled', failure }
    }
    const delay = RECOVERY_RETRY_DELAYS_MS[this.attempts]
    this.attempts++
    if (delay === undefined) {
      this.failure = failure
      this.log(`frame recovery failed ${this.attempts} times, giving up`)
      return { status: 'disabled', failure }
    }
    this.nextAttemptAt = this.deps.now() + delay
    this.log(`frame recovery failed, retrying in ${delay}ms`)
    return { status: 'pending' }
  }

  private disposeStrategy(): void {
    this.strategy?.dispose()
    this.strategy = null
    this.resolvedSrc = null
  }
}
