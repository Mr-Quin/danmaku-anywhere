/**
 * Tracks video elements currently in the DOM and manages play/pause listeners
 * on each. Provides priority-based selection of the "best" active video.
 */
export class VideoStack {
  private videos: HTMLVideoElement[] = []
  private listeners = new WeakMap<HTMLVideoElement, () => void>()

  /**
   * Add a video to the stack. Returns false if already tracked (dedup guard).
   * Attaches play/pause listeners that call onPlayStateChange.
   */
  add(video: HTMLVideoElement, onPlayStateChange: () => void): boolean {
    if (this.videos.includes(video)) {
      return false
    }

    this.videos.push(video)
    video.addEventListener('play', onPlayStateChange)
    video.addEventListener('pause', onPlayStateChange)
    this.listeners.set(video, onPlayStateChange)
    return true
  }

  /**
   * Remove a video from the stack. Returns false if not tracked.
   * Detaches its play/pause listeners.
   */
  remove(video: HTMLVideoElement): boolean {
    const index = this.videos.indexOf(video)
    if (index === -1) {
      return false
    }

    this.videos.splice(index, 1)
    const listener = this.listeners.get(video)
    if (listener) {
      video.removeEventListener('play', listener)
      video.removeEventListener('pause', listener)
      this.listeners.delete(video)
    }
    return true
  }

  /** Returns a snapshot of tracked videos contained within the given element. */
  within(element: Element): HTMLVideoElement[] {
    return this.videos.filter((v) => element.contains(v))
  }

  /**
   * Select the highest-priority video from the stack.
   *
   * Priority order:
   * 1. Playing and visible
   * 2. Playing (any visibility)
   * 3. Visible (any play state)
   * 4. First in stack (FIFO)
   */
  selectBest(): HTMLVideoElement | undefined {
    let playing: HTMLVideoElement | undefined
    let visible: HTMLVideoElement | undefined

    for (const v of this.videos) {
      const isPlaying = !v.paused
      const isVisible = v.checkVisibility()
      if (isPlaying && isVisible) {
        return v
      }
      if (isPlaying && !playing) {
        playing = v
      }
      if (isVisible && !visible) {
        visible = v
      }
    }

    return playing ?? visible ?? this.videos[0]
  }

  /** Remove all tracked videos and detach their listeners. */
  clear(): void {
    for (const video of this.videos) {
      const listener = this.listeners.get(video)
      if (listener) {
        video.removeEventListener('play', listener)
        video.removeEventListener('pause', listener)
      }
    }
    this.videos = []
  }
}
