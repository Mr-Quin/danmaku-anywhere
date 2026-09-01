export interface FakeControl {
  latencyMs?: number
  fail?: string[]
}

export function readFakeControl(): FakeControl {
  if (typeof window === 'undefined') {
    return {}
  }
  const control = (window as unknown as { __DA_FAKE__?: FakeControl })
    .__DA_FAKE__
  return control ?? {}
}

export function shouldFail(action: string): boolean {
  const { fail } = readFakeControl()
  return Array.isArray(fail) && fail.includes(action)
}

export function fakeLatencyMs(): number {
  const { latencyMs } = readFakeControl()
  return typeof latencyMs === 'number' && latencyMs > 0 ? latencyMs : 0
}
