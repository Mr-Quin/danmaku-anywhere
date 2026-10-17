import type { OptionsRecoveryCopy } from './recoveryCopy'

// Asks the context that owns the option stores to upgrade them. Both methods
// reject when the upgrade fails; readiness reports that failure on its own.
export interface OptionsUpgrader {
  // Does nothing once readiness is ready.
  ensureUpgraded(): Promise<void>
  // Runs even when readiness is ready, for stores changed behind its back.
  upgrade(): Promise<void>
  // Saves what one store holds as a recovery copy and resolves with it.
  saveRecoveryCopy(key: string): Promise<OptionsRecoveryCopy>
  // Resets one store to its defaults once its recovery copy is saved, then
  // runs the upgrade again. Resolves even when the upgrade still fails for
  // another store.
  resetStore(key: string, copyId: string): Promise<void>
}

export const OptionsUpgraderSymbol = Symbol.for('OptionsUpgrader')
