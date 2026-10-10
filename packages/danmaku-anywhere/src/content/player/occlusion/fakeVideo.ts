import { type Mock, vi } from 'vitest'

type Listener = () => void

export class FakeVideo {
  readyState = 0
  currentTime = 0
  currentSrc = ''
  src = ''
  playbackRate = 1
  paused = true
  crossOrigin: string | null = null
  muted = false
  playsInline = false
  preload = ''
  style: { cssText: string } = { cssText: '' }
  play: Mock = vi.fn(() => {
    this.paused = false
    return Promise.resolve()
  })
  pause: Mock = vi.fn(() => {
    this.paused = true
  })
  load: Mock = vi.fn()
  remove: Mock = vi.fn()
  removeAttribute: Mock = vi.fn()
  private readonly listeners = new Map<string, Set<Listener>>()

  addEventListener(type: string, fn: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>()
    set.add(fn)
    this.listeners.set(type, set)
  }

  removeEventListener(type: string, fn: Listener): void {
    this.listeners.get(type)?.delete(fn)
  }

  dispatch(type: string): void {
    for (const fn of this.listeners.get(type) ?? []) {
      fn()
    }
  }
}

export function asVideo(fake: FakeVideo): HTMLVideoElement {
  return fake as unknown as HTMLVideoElement
}

export function makeVideo(overrides: Partial<FakeVideo> = {}): FakeVideo {
  return Object.assign(new FakeVideo(), {
    currentSrc: 'http://example.com/v.webm',
    ...overrides,
  })
}
