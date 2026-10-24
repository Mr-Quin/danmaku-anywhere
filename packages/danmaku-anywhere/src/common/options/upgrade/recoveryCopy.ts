// What an option store held when the user chose to reset it. Copies are kept
// in storage.local under OPTIONS_RECOVERY_KEY, oldest first. A new copy never
// replaces an earlier one, so a reset that runs twice keeps the data from
// before the first, until MAX_RECOVERY_COPIES newer copies push it out.
export interface OptionsRecoveryCopy {
  id: string
  store: string
  savedAt: number
  // The store's envelope as read, when it could be read
  envelope?: unknown
  // Every stored item of the store, when it could not be read as one envelope
  items?: Record<string, unknown>
}

export const OPTIONS_RECOVERY_KEY = 'optionsRecovery'

export const MAX_RECOVERY_COPIES = 20

export function recoveryFileName(copy: OptionsRecoveryCopy): string {
  const time = new Date(copy.savedAt).toISOString().replaceAll(':', '-')
  return `danmaku-anywhere-${copy.store}-recovery-${time}.json`
}
