import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AutoCloseTimer } from './autoCloseTimer'

/**
 * AutoCloseTimer closes a toast once its time is up, and a pause (hovering the
 * toast pile) holds the time that is left instead of starting over.
 */

function timer(duration: number) {
  const state = { closed: false }
  const instance = new AutoCloseTimer(duration, () => {
    state.closed = true
  })
  return { instance, state }
}

describe('AutoCloseTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('expires after its duration', () => {
    const { instance, state } = timer(1000)
    instance.resume()

    vi.advanceTimersByTime(999)
    expect(state.closed).toBe(false)
    vi.advanceTimersByTime(1)
    expect(state.closed).toBe(true)
  })

  it('keeps the remaining time across a pause', () => {
    const { instance, state } = timer(1000)
    instance.resume()
    vi.advanceTimersByTime(600)
    instance.pause()
    vi.advanceTimersByTime(5000)
    expect(state.closed).toBe(false)

    instance.resume()
    vi.advanceTimersByTime(399)
    expect(state.closed).toBe(false)
    vi.advanceTimersByTime(1)
    expect(state.closed).toBe(true)
  })

  it('never fires once stopped', () => {
    const { instance, state } = timer(1000)
    instance.resume()
    instance.stop()
    vi.advanceTimersByTime(2000)
    expect(state.closed).toBe(false)
  })
})
