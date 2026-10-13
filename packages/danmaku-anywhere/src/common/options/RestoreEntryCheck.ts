// A rule for restored list entries that a store's zod schema cannot express,
// such as one that needs data from another service.
export interface IRestoreEntryCheck {
  // The IStoreService name the check applies to
  readonly store: string
  // Why the entry cannot be restored, or undefined to restore it
  check(entry: unknown): Promise<string | undefined>
}

export const RestoreEntryCheckSymbol = Symbol.for('RestoreEntryCheck')
