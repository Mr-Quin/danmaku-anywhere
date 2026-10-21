import { describe, expect, it } from 'vitest'
import { EXTENSION_VERSION } from '@/common/constants'
import {
  canRetryAutomatically,
  failedOnThisBuild,
  startedRun,
  type UpgradeRun,
} from './upgradeRun'

/**
 * canRetryAutomatically lets a startup or wake retry a failed upgrade after a
 * delay that grows four times per attempt, starting at one minute, and stops
 * after five attempts. A run still marked running five minutes after it
 * started was cut off: it counts as a failed attempt, so a worker that keeps
 * dying mid-run ends on the failure screen and cannot retry forever. Only this
 * build's attempts count: a record left by an earlier build allows a retry at
 * once, and startedRun counts from one again.
 */

const MINUTE = 60_000
const OLD_BUILD = '0.0.1'

function failed(attempts: number, failedAt = 0, build = EXTENSION_VERSION) {
  return {
    status: 'failed',
    build,
    attempts,
    failedAt,
    message: 'IO error',
  } satisfies UpgradeRun
}

function running(attempts: number, startedAt = 0, build = EXTENSION_VERSION) {
  return { status: 'running', build, attempts, startedAt } satisfies UpgradeRun
}

describe('failedOnThisBuild', () => {
  it('reports a failure of this build', () => {
    expect(failedOnThisBuild(failed(1), 0)).toEqual(failed(1))
  })

  it('ignores a failure of an earlier build', () => {
    expect(failedOnThisBuild(failed(1, 0, OLD_BUILD), 0)).toBeUndefined()
  })

  it('leaves a run that started less than five minutes ago running', () => {
    expect(failedOnThisBuild(running(1), 5 * MINUTE - 1)).toBeUndefined()
  })

  it('counts a run that started after the current time as failed', () => {
    expect(failedOnThisBuild(running(1, 10 * MINUTE), 0)).toMatchObject({
      status: 'failed',
      attempts: 1,
    })
  })

  it('counts a run still running after five minutes as failed', () => {
    expect(failedOnThisBuild(running(2), 5 * MINUTE)).toMatchObject({
      status: 'failed',
      attempts: 2,
      failedAt: 5 * MINUTE,
    })
  })
})

describe('canRetryAutomatically', () => {
  it('runs when nothing has been attempted', () => {
    expect(canRetryAutomatically(undefined, 0)).toBe(true)
  })

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

  it('stops retrying a worker that keeps dying mid-run', () => {
    expect(canRetryAutomatically(running(5), 1000 * MINUTE)).toBe(false)
  })

  it('retries at once after attempts on an earlier build', () => {
    expect(canRetryAutomatically(failed(5, 0, OLD_BUILD), 0)).toBe(true)
    expect(canRetryAutomatically(running(5, 0, OLD_BUILD), 0)).toBe(true)
  })
})

describe('startedRun', () => {
  it('counts on from an earlier attempt on this build', () => {
    expect(startedRun(failed(2), 7)).toEqual(running(3, 7))
  })

  it('starts counting again after attempts on an earlier build', () => {
    expect(startedRun(failed(4, 0, OLD_BUILD), 7)).toEqual(running(1, 7))
  })
})
