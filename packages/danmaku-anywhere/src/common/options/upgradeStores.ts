import type { ILogger } from '@/common/Logger'
import type { IStoreService } from './IStoreService'
import type { StoreSnapshot } from './OptionsService/types'

// Tries every store even after one fails, then rejects naming each store that
// did not persist. Callers record the version marker only when this resolves,
// so a partial upgrade is retried from the start.
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

  const errors: unknown[] = []
  const failed: string[] = []
  for (const service of services) {
    try {
      await service.options.upgrade(stores)
    } catch (error) {
      logger.error(`Failed to upgrade ${service.options.key}`, error)
      errors.push(error)
      failed.push(service.options.key)
    }
  }

  if (failed.length > 0) {
    throw new AggregateError(
      errors,
      `Failed to upgrade options: ${failed.join(', ')}`
    )
  }
}
