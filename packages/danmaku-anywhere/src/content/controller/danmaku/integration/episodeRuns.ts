export interface EpisodeRun {
  readonly generation: number
  // Aborts when a newer run starts or the integration stops watching the page.
  readonly signal: AbortSignal
  isCurrent: () => boolean
}

type RunListener = (current: EpisodeRun | undefined) => void

/**
 * The integration's work on one episode of one video. Only the integration
 * starts and ends runs; everything that acts on a run's behalf checks that it
 * is still current before touching the player, the stores or the toast.
 */
export class EpisodeRuns {
  private generation = 0
  private active: { run: EpisodeRun; controller: AbortController } | undefined
  private readonly listeners = new Set<RunListener>()

  begin(): EpisodeRun {
    this.abortCurrent()
    const controller = new AbortController()
    const run: EpisodeRun = {
      generation: ++this.generation,
      signal: controller.signal,
      isCurrent: () => !controller.signal.aborted,
    }
    this.active = { run, controller }
    this.notify(run)
    return run
  }

  current(): EpisodeRun | undefined {
    return this.active?.run
  }

  end() {
    if (!this.active) {
      return
    }
    this.abortCurrent()
    this.notify(undefined)
  }

  subscribe(listener: RunListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private abortCurrent() {
    this.active?.controller.abort()
    this.active = undefined
  }

  private notify(run: EpisodeRun | undefined) {
    for (const listener of this.listeners) {
      listener(run)
    }
  }
}
