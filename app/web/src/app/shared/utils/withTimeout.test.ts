import { describe, expect, it } from 'vitest'

import { withTimeout } from './withTimeout'

/**
 * Exercises withTimeout: a promise that settles before the deadline resolves
 * (or rejects) with its own value, a slow promise rejects with the timeout
 * error, and a custom message overrides the default. Uses real timers with
 * short deadlines so the race is observable without fake-timer plumbing.
 */
describe('withTimeout', () => {
  it('resolves with the value when the promise settles first', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 50)
    expect(result).toBe('ok')
  })

  it('propagates rejection when the promise rejects first', async () => {
    await expect(
      withTimeout(Promise.reject(new Error('boom')), 50)
    ).rejects.toThrow('boom')
  })

  it('rejects with the default timeout error when the promise is too slow', async () => {
    const slow = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 50)
    })
    await expect(withTimeout(slow, 1)).rejects.toThrow('Request timed out')
  })

  it('uses the custom error message on timeout', async () => {
    const slow = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 50)
    })
    await expect(withTimeout(slow, 1, 'too slow')).rejects.toThrow('too slow')
  })
})
