import { describe, expect, it } from 'vitest'
import { canRetryAutomatically, settleRun, type UpgradeRun } from './upgradeRun'

/**
 * canRetryAutomatically lets a startup or wake retry a failed upgrade after a
 * delay that grows four times per attempt, starting at one minute, and stops
 * after five attempts. A failure that every attempt would repeat, a full
 * storage area or an item over the size limit, is not retried at all. A run
 * still marked running five minutes after it started was cut off: it settles
 * as a failed attempt, both for what the UI shows and for the retry delay, so
 * a worker that keeps dying mid-run cannot retry forever.
 */

const MINUTE = 60_000

function failed(
  attempts: number,
  failedAt = 0
): Extract<UpgradeRun, { status: 'failed' }> {
  return { status: 'failed', attempts, failedAt, message: 'IO error' }
}

function running(attempts: number, startedAt = 0): UpgradeRun {
  return { status: 'running', attempts, startedAt }
}

describe('settleRun', () => {
  it('leaves a run that started less than five minutes ago running', () => {
    expect(settleRun(running(1), 5 * MINUTE - 1)).toEqual(running(1))
  })

  it('counts a run still running after five minutes as failed', () => {
    expect(settleRun(running(2), 5 * MINUTE)).toMatchObject({
      status: 'failed',
      attempts: 2,
      failedAt: 5 * MINUTE,
    })
  })
})

describe('canRetryAutomatically', () => {
  it('retries a run that is still running', () => {
    expect(canRetryAutomatically(running(1), 0)).toBe(true)
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

  it('stops after five attempts', () => {
    expect(canRetryAutomatically(failed(5), 1000 * MINUTE)).toBe(false)
  })

  it('applies the retry delay to a cut-off run from when it went stale', () => {
    expect(canRetryAutomatically(running(1), 6 * MINUTE - 1)).toBe(false)
    expect(canRetryAutomatically(running(1), 6 * MINUTE)).toBe(true)
  })

  it('does not retry a failure where every store would fail the same way again', () => {
    const run: UpgradeRun = {
      ...failed(1),
      stores: [
        { store: 'danmakuOptions', problem: 'itemTooLarge' },
        { store: 'mountConfig', problem: 'storeFull' },
      ],
    }

    expect(canRetryAutomatically(run, 1000 * MINUTE)).toBe(false)
  })

  it('retries a failure where some store may pass next time', () => {
    const run: UpgradeRun = {
      ...failed(1),
      stores: [
        { store: 'danmakuOptions', problem: 'storeFull' },
        { store: 'mountConfig', problem: 'writeRateLimited' },
      ],
    }

    expect(canRetryAutomatically(run, MINUTE)).toBe(true)
  })

  it('stops retrying a worker that keeps dying mid-run', () => {
    expect(canRetryAutomatically(running(5), 1000 * MINUTE)).toBe(false)
  })
})
