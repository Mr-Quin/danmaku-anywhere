import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createThrottle } from './createThrottle'

describe('createThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should throttle calls to respect the specified delay', async () => {
    const delayMs = 500
    const throttle = createThrottle(delayMs)

    const fn = vi.fn(async (cb: any) => {
      const p = throttle()
      cb()
      await p
    })

    // first call should not be delayed
    await fn(() => vi.advanceTimersByTime(0))
    // first call should not be delayed
    expect(fn).toHaveResolvedTimes(1)

    // second call should be delayed
    await fn(() => {
      expect(vi.getTimerCount()).toBe(1)
      vi.advanceTimersByTime(delayMs)
    })
    expect(fn).toHaveResolvedTimes(2)

    // third call should be delayed
    await fn(() => {
      expect(vi.getTimerCount()).toBe(1)
      vi.advanceTimersByTime(delayMs)
    })
    expect(fn).toHaveResolvedTimes(3)

    // wait until the next call is allowed, this call should not be delayed
    vi.advanceTimersByTime(delayMs)
    await fn(() => {
      expect(vi.getTimerCount()).toBe(1)
      vi.advanceTimersByTime(0)
    })
    expect(fn).toHaveResolvedTimes(4)
  })

  it('should handle concurrent calls correctly', async () => {
    const delayMs = 500
    const throttle = createThrottle(delayMs)

    const fn = vi.fn(async (cb: any) => {
      const p = throttle()
      await p
      return cb
    })

    const promises = [1, 2, 3, 4, 5].map(fn)

    const startTime = Date.now()

    expect(vi.getTimerCount()).toBe(5)
    vi.advanceTimersToNextTimer()
    expect(vi.getTimerCount()).toBe(4)
    await promises[0]
    expect(Date.now() - startTime).toBe(0) // first call should not be delayed
    expect(fn).toHaveResolvedTimes(1)

    vi.advanceTimersToNextTimer()
    expect(vi.getTimerCount()).toBe(3)
    await promises[1]
    expect(Date.now() - startTime).toBe(500) // second call should be delayed by 500ms
    expect(fn).toHaveResolvedTimes(2)

    vi.advanceTimersToNextTimer()
    expect(vi.getTimerCount()).toBe(2)
    await promises[2]
    expect(Date.now() - startTime).toBe(1000) // third call should be delayed by 1000ms
    expect(fn).toHaveResolvedTimes(3)

    vi.advanceTimersToNextTimer()
    expect(vi.getTimerCount()).toBe(1)
    await promises[3]
    expect(Date.now() - startTime).toBe(1500) // fourth call should be delayed by 1500ms
    expect(fn).toHaveResolvedTimes(4)

    vi.advanceTimersToNextTimer()
    expect(vi.getTimerCount()).toBe(0)
    await promises[4]
    expect(Date.now() - startTime).toBe(2000) // fifth call should be delayed by 2000ms
    expect(fn).toHaveResolvedTimes(5)
  })
})
