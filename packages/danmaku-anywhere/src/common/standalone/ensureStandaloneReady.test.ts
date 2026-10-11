import { describe, expect, it, vi } from 'vitest'
import { ensureStandaloneReady } from './ensureStandaloneReady'

const upgrade = vi.hoisted(() => vi.fn<() => Promise<void>>())

vi.mock('@/common/environment/isStandalone', () => {
  return { IS_STANDALONE_RUNTIME: true }
})

vi.mock('@/common/ioc/uiIoc', () => {
  return { uiContainer: { get: () => ({ upgrade }) } }
})

/**
 * ensureStandaloneReady runs the standalone upgrade once and shares it between
 * callers. A failed upgrade is not kept, so the next call runs it again.
 */

describe('ensureStandaloneReady', () => {
  it('runs the upgrade again after a failed attempt', async () => {
    upgrade
      .mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'))
      .mockResolvedValue(undefined)

    await expect(ensureStandaloneReady()).rejects.toThrow(
      'QUOTA_BYTES quota exceeded'
    )
    await expect(ensureStandaloneReady()).resolves.toBeUndefined()
    await ensureStandaloneReady()

    expect(upgrade).toHaveBeenCalledTimes(2)
  })
})
