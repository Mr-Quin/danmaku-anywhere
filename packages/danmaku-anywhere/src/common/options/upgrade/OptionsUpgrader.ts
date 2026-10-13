// Asks the context that owns the option stores to upgrade them. Both methods
// reject when the upgrade fails; readiness reports that failure on its own.
export interface OptionsUpgrader {
  // Does nothing once readiness is ready.
  ensureUpgraded(): Promise<void>
  // Runs even when readiness is ready, for stores changed behind its back.
  upgrade(): Promise<void>
}

export const OptionsUpgraderSymbol = Symbol.for('OptionsUpgrader')
