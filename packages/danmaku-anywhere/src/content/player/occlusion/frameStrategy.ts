export interface Frame {
  element: HTMLVideoElement
  mediaTime: number
}

export type FrameFailure =
  | {
      kind: 'protected'
      evidence: 'encrypted' | 'non-http' | 'same-origin' | 'clone-tainted'
    }
  | { kind: 'unavailable'; evidence: 'clone-failed' | 'clone-stalled' }

export type AcquireResult =
  | { status: 'frame'; frame: Frame }
  | { status: 'pending' }
  | { status: 'failed'; failure: FrameFailure }

// `acquire` runs once per capture cycle and must never block: `pending` means
// ask again next cycle.
export interface FrameStrategy {
  acquire(): Promise<AcquireResult>
  dispose(): void
}
