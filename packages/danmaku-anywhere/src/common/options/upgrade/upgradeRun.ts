// The last upgrade attempt, kept in storage.local so every context sees it.
// attempts counts every attempt started since the last success or new build.
// The record and the upgrade snapshot are removed together when an attempt
// succeeds.
export type UpgradeRun =
  | { status: 'running'; attempts: number; startedAt: number }
  | { status: 'failed'; attempts: number; failedAt: number; message: string }

export const UPGRADE_RUN_KEY = 'optionsUpgradeRun'
export const UPGRADE_SNAPSHOT_KEY = 'optionsUpgradeSnapshot'

const MAX_AUTOMATIC_ATTEMPTS = 5
const FIRST_RETRY_DELAY_MS = 60_000
const STALE_RUN_MS = 5 * 60_000

// When a run still marked running counts as cut off, usually because the
// worker was stopped in the middle of it.
export function staleAt(run: UpgradeRun): number | undefined {
  if (run.status !== 'running') {
    return undefined
  }
  return run.startedAt + STALE_RUN_MS
}

// A run cut off before it finished is a failed attempt.
export function settleRun(run: UpgradeRun, now: number): UpgradeRun {
  const deadline = staleAt(run)
  if (deadline === undefined || now < deadline) {
    return run
  }
  return {
    status: 'failed',
    attempts: run.attempts,
    failedAt: deadline,
    message: 'The options upgrade stopped before it finished',
  }
}

// Startup and worker wakes retry a failed upgrade on their own only a few
// times, with a growing delay. Retry in the UI and an extension update always
// run.
export function canRetryAutomatically(run: UpgradeRun, now: number): boolean {
  const settled = settleRun(run, now)
  if (settled.attempts >= MAX_AUTOMATIC_ATTEMPTS) {
    return false
  }
  if (settled.status === 'running') {
    return true
  }
  const delay = FIRST_RETRY_DELAY_MS * 4 ** (settled.attempts - 1)
  return now - settled.failedAt >= delay
}
