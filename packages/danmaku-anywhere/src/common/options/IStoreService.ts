import type { ZodType } from 'zod'
import type { OptionsService } from './OptionsService/OptionsService'

export interface IStoreService {
  // biome-ignore lint/suspicious/noExplicitAny: generic options service
  options: OptionsService<any>
  name: string
  shouldBackup?: boolean
  /**
   * Validates a restored payload once it has been migrated to the store's
   * latest version. A payload that fails is not written. What gets written is
   * the parse output, so defaults and coercions apply and any key the schema
   * does not declare is dropped unless the schema is loose.
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

export type IOptionStoresProvider = () => IStoreService[]

export const OptionStoresProvider = Symbol.for('OptionStoresProvider')
