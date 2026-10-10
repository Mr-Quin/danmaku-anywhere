import type { ZodType } from 'zod'
import type { OptionsService } from './OptionsService/OptionsService'

export interface IStoreService {
  // biome-ignore lint/suspicious/noExplicitAny: generic options service
  options: OptionsService<any>
  name: string
  shouldBackup?: boolean
  /**
   * Validates a restored payload once it has been migrated to the store's
   * latest version. A payload that fails is not written.
   */
  backupSchema?: ZodType
  /**
   * Same idea for a store that holds a list, but applied to one entry at a
   * time. Entries that fail are dropped and counted so that one bad entry in a
   * restored file does not cost the user the good ones.
   */
  backupItemSchema?: ZodType
  /**
   * The id an entry of a restored list will carry once migrated, read from the
   * entry as it was saved. Needed when migration can append entries of its
   * own, because losses are then counted by which saved ids survive. Without
   * it losses are counted by list length, which is only right while migration
   * never adds entries.
   */
  backupEntryId?: (entry: unknown) => string | undefined
}

export const StoreServiceSymbol = Symbol.for('StoreService')
