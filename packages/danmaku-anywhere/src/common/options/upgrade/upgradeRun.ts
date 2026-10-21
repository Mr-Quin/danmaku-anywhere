import { EXTENSION_VERSION } from '@/common/constants'

// The last upgrade attempt, kept in storage.local so every context sees it,
// and removed when an attempt succeeds. attempts counts the attempts this
// build has started since the last success. A new build may fix what failed,
// so a record left by another build does not count against this one.
export type UpgradeRun =
  | { status: 'running'; build: string; attempts: number; startedAt: number }
  | {
      status: 'failed'
      build: string
      attempts: number
      failedAt: number
      message: string
    }

export const UPGRADE_RUN_KEY = 'optionsUpgradeRun'

const MAX_AUTOMATIC_ATTEMPTS = 5
const FIRST_RETRY_DELAY_MS = 60_000
export const STALE_RUN_MS = 5 * 60_000

function onThisBuild(run: UpgradeRun | undefined): UpgradeRun | undefined {
  return run?.build === EXTENSION_VERSION ? run : undefined
}

export function startedRun(
  previous: UpgradeRun | undefined,
  now: number
): UpgradeRun {
  return {
    status: 'running',
    build: EXTENSION_VERSION,
    attempts: (onThisBuild(previous)?.attempts ?? 0) + 1,
    startedAt: now,
  }
}

// When a run of this build still marked running counts as cut off, usually
// because the worker was stopped in the middle of it.
export function staleAt(run: UpgradeRun | undefined): number | undefined {
  const own = onThisBuild(run)
  if (own?.status !== 'running') {
    return undefined
  }
  return own.startedAt + STALE_RUN_MS
}

// A run cut off before it finished is a failed attempt, so a migration that
// stops the worker every time still ends on the failure screen.
function settleRun(run: UpgradeRun, now: number): UpgradeRun {
  const deadline = staleAt(run)
  // A start time ahead of the clock means the clock went back, and how long
  // the run has taken can no longer be told.
  const clockWentBack = run.status === 'running' && run.startedAt > now
  if (deadline === undefined || (now < deadline && !clockWentBack)) {
    return run
  }
  return {
    status: 'failed',
    build: run.build,
    attempts: run.attempts,
    failedAt: deadline,
    message: 'The options upgrade stopped before it finished',
  }
}

export function failedOnThisBuild(
  run: UpgradeRun | undefined,
  now: number
): Extract<UpgradeRun, { status: 'failed' }> | undefined {
  const own = onThisBuild(run)
  if (!own) {
    return undefined
  }
  const settled = settleRun(own, now)
  return settled.status === 'failed' ? settled : undefined
}

// Startup and worker wakes retry a failed upgrade on their own only a few
// times, with a growing delay. Retry in the UI and an extension update always
// run.
export function canRetryAutomatically(
  run: UpgradeRun | undefined,
  now: number
): boolean {
  const own = onThisBuild(run)
  if (!own) {
    return true
  }
  const settled = settleRun(own, now)
  if (settled.attempts >= MAX_AUTOMATIC_ATTEMPTS) {
    return false
  }
  if (settled.status === 'running') {
    return true
  }
  const delay = FIRST_RETRY_DELAY_MS * 4 ** (settled.attempts - 1)
  return now - settled.failedAt >= delay
}
