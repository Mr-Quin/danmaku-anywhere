import type { AcquireResult, FrameStrategy } from './frameStrategy'

// Classification already established readability, so no per-frame re-probe.
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
