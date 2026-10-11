import { Injectable, signal } from '@angular/core'

export interface FakeBackendCall {
  ts: number
  channel: 'extension' | 'bangumi'
  action: string
  argsSummary: string
  ok: boolean
}

const RING_BUFFER_SIZE = 50

export abstract class FakeBackendRecorder {
  abstract readonly entries: () => readonly FakeBackendCall[]
  abstract record(call: Omit<FakeBackendCall, 'ts'>): void
}

@Injectable()
export class FakeBackendRecorderImpl extends FakeBackendRecorder {
  private readonly $entries = signal<FakeBackendCall[]>([])

  readonly entries = this.$entries.asReadonly()

  record(call: Omit<FakeBackendCall, 'ts'>): void {
    this.$entries.update((prev) => {
      const next = [...prev, { ...call, ts: Date.now() }]
      if (next.length > RING_BUFFER_SIZE) {
        return next.slice(next.length - RING_BUFFER_SIZE)
      }
      return next
    })
  }
}

@Injectable()
export class NoopFakeBackendRecorder extends FakeBackendRecorder {
  readonly entries = () => [] as const

  record(): void {
    return
  }
}
