import type { OptionsRecoveryCopy } from './recoveryCopy'

// Asks the context that owns the option stores to upgrade them. Both methods
// reject when the upgrade fails; readiness reports that failure on its own.
export interface OptionsUpgrader {
  // Does nothing once readiness is ready.
  ensureUpgraded(): Promise<void>
  // Runs even when readiness is ready, for stores changed behind its back.
  upgrade(): Promise<void>
  // Keeps a recovery copy of one store, resets it to its defaults and runs
  // the upgrade again. Resolves with the copy even when the upgrade still
  // fails for another store.
  resetStore(key: string): Promise<OptionsRecoveryCopy>
}

export const OptionsUpgraderSymbol = Symbol.for('OptionsUpgrader')
