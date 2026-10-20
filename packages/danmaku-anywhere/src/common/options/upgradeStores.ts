import type { ILogger } from '@/common/Logger'
import type { IStoreService } from './IStoreService'
import type { StoreSnapshot } from './OptionsService/types'

// Steps that read other stores get every store's data as it was when the run
// started. The run stops at the first store that fails, and bindOptionStores
// runs a store that reads another before the store it reads, so a retry still
// finds the data that reader needs.
export async function upgradeStores(
  services: IStoreService[],
  logger: ILogger
): Promise<void> {
  const stores: StoreSnapshot = {}
  for (const service of services) {
    const stored = await service.options.readStoredUnblocked()
    if (stored) {
      stores[service.options.key] = stored.data
    }
  }

  for (const service of services) {
    try {
      await service.options.upgrade(stores)
    } catch (error) {
      logger.error(`Failed to upgrade ${service.options.key}`, error)
      throw new Error(`Failed to upgrade options: ${service.options.key}`, {
        cause: error,
      })
    }
  }
}
