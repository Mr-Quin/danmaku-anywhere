import type { ILogger } from '@/common/Logger'
import type { IStoreService } from './IStoreService'
import type { StoreSnapshot } from './OptionsService/types'
import {
  type StoreFailure,
  toStoreFailure,
  upgradeFailedError,
} from './upgrade/upgradeFailure'

// Steps that read other stores get every store's data as it was when the run
// started. The run stops at the first store that fails, and bindOptionStores
// runs a store that reads another before the store it reads, so a retry still
// finds the data that reader needs. Failures reject with
// options.upgradeFailed naming the store and why. A store that cannot be read
// rejects before anything is written.
export async function upgradeStores(
  services: IStoreService[],
  logger: ILogger
): Promise<void> {
  const stores: StoreSnapshot = {}
  const unreadable: StoreFailure[] = []
  const readErrors: unknown[] = []
  for (const service of services) {
    const { key } = service.options
    try {
      const stored = await service.options.readStoredUnblocked()
      if (stored) {
        stores[key] = stored.data
      }
    } catch (error) {
      logger.error(`Failed to read ${key}`, error)
      unreadable.push(toStoreFailure(key, error))
      readErrors.push(error)
    }
  }
  if (unreadable.length > 0) {
    throw upgradeFailedError(unreadable, readErrors)
  }

  for (const service of services) {
    const { key } = service.options
    try {
      await service.options.upgrade(stores)
    } catch (error) {
      logger.error(`Failed to upgrade ${key}`, error)
      throw upgradeFailedError([toStoreFailure(key, error)], [error])
    }
  }
}
