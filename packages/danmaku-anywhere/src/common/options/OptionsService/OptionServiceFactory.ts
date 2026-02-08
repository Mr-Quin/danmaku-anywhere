import type { ResolutionContext } from 'inversify'
import type { ILogger } from '@/common/Logger'
import type { ExtStorageType } from '@/common/storage/getStorageArea'
import { ReadinessService } from '../ReadinessService/ReadinessService'
import { OptionsService } from './OptionsService'
import type { OptionsSchema } from './types'

export type IOptionsServiceFactory = <T extends OptionsSchema>(
  key: string,
  defaultOptions: T,
  logger: ILogger,
  storageType?: ExtStorageType
) => OptionsService<T>

export const OptionsServiceFactory = Symbol.for('OptionsServiceFactory')

export function optionsServiceFactory(
  context: ResolutionContext
): IOptionsServiceFactory {
  return <T extends OptionsSchema>(
    key: string,
    defaultOptions: T,
    logger: ILogger,
    storageType?: ExtStorageType
  ) => {
    const readinessService = context.get<ReadinessService>(ReadinessService)
    return new OptionsService<T>(
      readinessService,
      key,
      defaultOptions,
      logger,
      storageType
    )
  }
}
