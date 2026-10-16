// Counts down a toast's display time, keeping what is left across pauses.
export class AutoCloseTimer {
  private remaining: number
  private startedAt = 0
  private handle: ReturnType<typeof setTimeout> | undefined

  constructor(
    duration: number,
    private readonly onExpire: () => void
  ) {
    this.remaining = duration
  }

  resume() {
    if (this.handle !== undefined) {
      return
    }
    this.startedAt = Date.now()
    this.handle = setTimeout(() => {
      this.handle = undefined
      this.onExpire()
    }, this.remaining)
  }

  pause() {
    if (this.handle === undefined) {
      return
    }
    clearTimeout(this.handle)
    this.handle = undefined
    this.remaining -= Date.now() - this.startedAt
  }

  stop() {
    clearTimeout(this.handle)
    this.handle = undefined
  }
}
