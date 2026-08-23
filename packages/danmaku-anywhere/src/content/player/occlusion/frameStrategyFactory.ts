import { CloneFrameStrategy } from './CloneFrameStrategy'
import { DirectFrameStrategy } from './DirectFrameStrategy'
import { probeReadability } from './frameProbe'
import type { FrameFailure, FrameStrategy } from './frameStrategy'

export type FramePlan =
  | { kind: 'strategy'; strategy: FrameStrategy }
  | { kind: 'pending' }
  | { kind: 'failed'; failure: FrameFailure }

export type IFrameStrategyFactory = (video: HTMLVideoElement) => FramePlan

export function frameStrategyFactory(): IFrameStrategyFactory {
  return (video) => {
    return classify(video)
  }
}

function classify(video: HTMLVideoElement): FramePlan {
  const readability = probeReadability(video)
  if (readability === 'undetermined' || !video.currentSrc) {
    return { kind: 'pending' }
  }
  if (readability === 'readable') {
    return { kind: 'strategy', strategy: new DirectFrameStrategy(video) }
  }
  if (video.mediaKeys) {
    return {
      kind: 'failed',
      failure: { kind: 'protected', evidence: 'encrypted' },
    }
  }
  // Same-origin media cannot taint, so a tainted one is protected content.
  if (isSameOrigin(video.currentSrc)) {
    return {
      kind: 'failed',
      failure: { kind: 'protected', evidence: 'same-origin' },
    }
  }
  if (!/^https?:/i.test(video.currentSrc)) {
    return {
      kind: 'failed',
      failure: { kind: 'protected', evidence: 'non-http' },
    }
  }
  return { kind: 'strategy', strategy: new CloneFrameStrategy(video) }
}

function isSameOrigin(src: string): boolean {
  try {
    return new URL(src, location.href).origin === location.origin
  } catch {
    return false
  }
}
