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
}

export const StoreServiceSymbol = Symbol.for('StoreService')
