import type { ZodType } from 'zod'
import type { OptionsService } from './OptionsService/OptionsService'

export interface IStoreService {
  // biome-ignore lint/suspicious/noExplicitAny: generic options service
  options: OptionsService<any>
  name: string
  shouldBackup?: boolean
  /**
   * Validates a restored payload that is already at the store's latest version.
   * Older payloads are migrated before they reach this shape, so they are not
   * checked against it.
   */
  backupSchema?: ZodType
  /**
   * Same idea for a store that holds a list, but applied to one entry at a
   * time. Entries that fail are dropped and counted so that one bad entry in a
   * restored file does not cost the user the good ones.
   */
  backupItemSchema?: ZodType
}

export const StoreServiceSymbol = Symbol.for('StoreService')
