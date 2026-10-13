import { describe, expect, it } from 'vitest'
import { canRetryAutomatically, type UpgradeRun } from './upgradeRun'

/**
 * canRetryAutomatically lets a startup or wake retry a failed upgrade after a
 * delay that grows four times per failed attempt, starting at one minute, and
 * stops after five failed attempts. A run left marked running was cut off, so
 * it is always retried.
 */

const MINUTE = 60_000

function failed(attempts: number, failedAt = 0): UpgradeRun {
  return { status: 'failed', attempts, failedAt, message: 'IO error' }
}

describe('canRetryAutomatically', () => {
  it('retries a run that was cut off while running', () => {
    expect(canRetryAutomatically({ status: 'running', attempts: 3 }, 0)).toBe(
      true
    )
  })

  it('waits a minute after the first failure', () => {
    expect(canRetryAutomatically(failed(1), MINUTE - 1)).toBe(false)
    expect(canRetryAutomatically(failed(1), MINUTE)).toBe(true)
  })

  it('waits four times longer after each further failure', () => {
    expect(canRetryAutomatically(failed(2), 4 * MINUTE - 1)).toBe(false)
    expect(canRetryAutomatically(failed(2), 4 * MINUTE)).toBe(true)
    expect(canRetryAutomatically(failed(4), 64 * MINUTE)).toBe(true)
  })

  it('stops after five failed attempts', () => {
    expect(canRetryAutomatically(failed(5), 1000 * MINUTE)).toBe(false)
  })
})
