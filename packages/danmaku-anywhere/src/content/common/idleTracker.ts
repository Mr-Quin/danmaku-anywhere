export interface IdleTrackerOptions {
  idleMs?: number
  /**
   * Only events accepted by this filter reset the idle timer. Useful when
   * listening on a broad target like `document` but gating activity to a
   * subtree (e.g. the video element and its overlay siblings).
   */
  shouldCount?: (event: Event) => boolean
}

const DEFAULT_IDLE_MS = 3000

/**
 * Tracks whether the user has been active within `idleMs`. Stays active until
 * the first activity, so a freshly mounted consumer is not hidden a few seconds
 * after load with no interaction.
 */
export class IdleTracker {
  private readonly target: EventTarget
  private readonly idleMs: number
  private readonly shouldCount?: (event: Event) => boolean
  private readonly listeners = new Set<(active: boolean) => void>()
  private readonly onActivity: EventListener
  private active = true
  private timeoutId?: ReturnType<typeof setTimeout>

  constructor(target: EventTarget, options: IdleTrackerOptions = {}) {
    this.target = target
    this.idleMs = options.idleMs ?? DEFAULT_IDLE_MS
    this.shouldCount = options.shouldCount
    this.onActivity = (event) => this.handleActivity(event)
    target.addEventListener('mousemove', this.onActivity)
    target.addEventListener('touchmove', this.onActivity, {
      capture: true,
      passive: true,
    })
  }

  subscribe(listener: (active: boolean) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getActive(): boolean {
    return this.active
  }

  destroy(): void {
    clearTimeout(this.timeoutId)
    this.target.removeEventListener('mousemove', this.onActivity)
    this.target.removeEventListener('touchmove', this.onActivity, {
      capture: true,
    })
    this.listeners.clear()
  }

  private setActive(next: boolean): void {
    if (this.active === next) {
      return
    }
    this.active = next
    for (const listener of this.listeners) {
      listener(next)
    }
  }

  private handleActivity(event: Event): void {
    if (this.shouldCount && !this.shouldCount(event)) {
      return
    }
    this.setActive(true)
    clearTimeout(this.timeoutId)
    this.timeoutId = setTimeout(() => this.setActive(false), this.idleMs)
  }
}
