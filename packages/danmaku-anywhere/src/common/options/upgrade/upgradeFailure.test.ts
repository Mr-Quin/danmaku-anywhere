import { describe, expect, it } from 'vitest'
import { canResetStore } from './upgradeFailure'

/**
 * canResetStore decides which stores on the upgrade failure screen get a
 * Reset next to Retry. A failure every attempt would repeat gets it at once.
 * A store that reads as incomplete may still be syncing in from another
 * device, so it gets Reset only once two upgrade attempts in a row have
 * failed. A write the browser rate limited and an unknown failure never get
 * it.
 */

describe('canResetStore', () => {
  it.each([
    'options.migration',
    'options.itemTooLarge',
    'options.storeFull',
  ] as const)('offers a reset for %s on the first failure', (problem) => {
    expect(canResetStore({ store: 'danmakuOptions', problem }, 1)).toBe(true)
  })

  it('offers a reset for an incomplete store from the second failed attempt', () => {
    const failure = {
      store: 'danmakuOptions',
      problem: 'options.incomplete',
    } as const

    expect(canResetStore(failure, 0)).toBe(false)
    expect(canResetStore(failure, 1)).toBe(false)
    expect(canResetStore(failure, 2)).toBe(true)
    expect(canResetStore(failure, 5)).toBe(true)
  })

  it.each([
    'options.writeRateLimited',
    'unknown',
  ] as const)('never offers a reset for %s', (problem) => {
    expect(canResetStore({ store: 'danmakuOptions', problem }, 5)).toBe(false)
  })
})
