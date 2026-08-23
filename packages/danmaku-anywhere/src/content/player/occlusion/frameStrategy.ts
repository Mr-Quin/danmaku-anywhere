export interface Frame {
  element: HTMLVideoElement
  mediaTime: number
}

export type FrameFailure =
  | {
      kind: 'protected'
      evidence: 'encrypted' | 'non-http' | 'same-origin' | 'clone-tainted'
    }
  | { kind: 'unavailable'; evidence: 'clone-failed' }

export type AcquireResult =
  | { status: 'frame'; frame: Frame }
  | { status: 'pending' }
  | { status: 'failed'; failure: FrameFailure }

/**
 * One way of obtaining frames from a video. `acquire` runs once per capture
 * cycle and must never block on setup: `pending` means "ask again next cycle".
 */
export interface FrameStrategy {
  acquire(): Promise<AcquireResult>
  dispose(): void
}
