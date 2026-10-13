// The last upgrade attempt, kept in storage.local so every context sees it.
// It is removed when an attempt succeeds.
export type UpgradeRun =
  | { status: 'running'; attempts: number }
  | { status: 'failed'; attempts: number; failedAt: number; message: string }

export const UPGRADE_RUN_KEY = 'optionsUpgradeRun'

const MAX_AUTOMATIC_ATTEMPTS = 5
const FIRST_RETRY_DELAY_MS = 60_000

// Startup and worker wakes retry a failed upgrade on their own only a few
// times, with a growing delay. Retry in the UI and an extension update always
// run.
export function canRetryAutomatically(run: UpgradeRun, now: number): boolean {
  if (run.status === 'running') {
    return true
  }
  if (run.attempts >= MAX_AUTOMATIC_ATTEMPTS) {
    return false
  }
  const delay = FIRST_RETRY_DELAY_MS * 4 ** (run.attempts - 1)
  return now - run.failedAt >= delay
}
