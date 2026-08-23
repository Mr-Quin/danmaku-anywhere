import type { AcquireResult, FrameStrategy } from './frameStrategy'

/**
 * Reads the live element. Does not re-probe, since classification already
 * established readability and a canvas read per frame would only cost time.
 */
export class DirectFrameStrategy implements FrameStrategy {
  constructor(private readonly video: HTMLVideoElement) {}

  acquire(): Promise<AcquireResult> {
    if (this.video.readyState < 2) {
      return Promise.resolve({ status: 'pending' })
    }
    return Promise.resolve({
      status: 'frame',
      frame: { element: this.video, mediaTime: this.video.currentTime },
    })
  }

  dispose(): void {
    return
  }
}
