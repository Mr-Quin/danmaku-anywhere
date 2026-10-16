// Rules for a restored list that a store's per-entry zod schema cannot
// express: ones that need data from another service, or that compare entries
// with each other.
export interface IRestoreListCheck {
  // The IStoreService name the check applies to
  readonly store: string
  // Gets the entries that passed the schema, in order. Returns, for each one,
  // why it cannot be restored, or undefined to restore it.
  check(entries: unknown[]): Promise<(string | undefined)[]>
}

export const RestoreListCheckSymbol = Symbol.for('RestoreListCheck')
