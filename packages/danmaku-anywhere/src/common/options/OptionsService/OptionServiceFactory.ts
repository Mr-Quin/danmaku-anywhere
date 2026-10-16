import type { ResolutionContext } from 'inversify'
import type { ILogger } from '@/common/Logger'
import { ReadinessService } from '../ReadinessService/ReadinessService'
import { OptionsService } from './OptionsService'
import type { OptionsStorageLocation } from './OptionsStorage'
import type { OptionsSchema } from './types'

export type IOptionsServiceFactory = <T extends OptionsSchema>(
  location: OptionsStorageLocation,
  defaultOptions: T,
  logger: ILogger
) => OptionsService<T>

export const OptionsServiceFactory = Symbol.for('OptionsServiceFactory')

export function optionsServiceFactory(
  context: ResolutionContext
): IOptionsServiceFactory {
  return <T extends OptionsSchema>(
    location: OptionsStorageLocation,
    defaultOptions: T,
    logger: ILogger
  ) => {
    const readinessService = context.get<ReadinessService>(ReadinessService)
    return new OptionsService<T>(
      readinessService,
      location,
      defaultOptions,
      logger
    )
  }
}
