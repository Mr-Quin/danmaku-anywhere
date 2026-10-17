// What an option store held before the user reset it, kept in storage.local
// under OPTIONS_RECOVERY_KEY, one copy per store key, and offered as a
// download when the reset happens.
export interface OptionsRecoveryCopy {
  store: string
  savedAt: number
  // Every stored item of the store, keyed by storage key
  items: Record<string, unknown>
}

export const OPTIONS_RECOVERY_KEY = 'optionsRecovery'

export function recoveryFileName(copy: OptionsRecoveryCopy): string {
  const date = new Date(copy.savedAt).toISOString().slice(0, 10)
  return `danmaku-anywhere-${copy.store}-recovery-${date}.json`
}
