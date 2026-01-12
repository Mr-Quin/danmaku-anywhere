import type { OptionsService } from './OptionsService/OptionsService'

export interface IStoreService {
  // biome-ignore lint/suspicious/noExplicitAny: generic options service
  options: OptionsService<any>
  name: string
}

export const StoreServiceSymbol = Symbol.for('StoreService')
