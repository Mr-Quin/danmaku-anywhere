import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withTimeout } from './withTimeout'

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('resolves with the value when the promise settles before the timeout', async () => {
    await expect(
      withTimeout(Promise.resolve({ data: 'ok' }), 1000)
    ).resolves.toEqual({ data: 'ok' })
  })

  it('propagates rejection when the promise rejects before the timeout', async () => {
    await expect(
      withTimeout(Promise.reject(new Error('boom')), 1000)
    ).rejects.toThrow('boom')
  })

  it('throws the default message when the timeout elapses first', async () => {
    const pending = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 2000)
    })
    const result = withTimeout(pending, 1000)
    const assertion = expect(result).rejects.toThrow('Request timed out')

    await vi.advanceTimersByTimeAsync(1000)
    await assertion
  })

  it('throws a custom message when provided', async () => {
    const pending = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 2000)
    })
    const result = withTimeout(pending, 1000, 'Custom timeout')
    const assertion = expect(result).rejects.toThrow('Custom timeout')

    await vi.advanceTimersByTimeAsync(1000)
    await assertion
  })

  it('clears the timeout once the promise settles', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    await withTimeout(Promise.resolve('done'), 1000)

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)
  })
})
