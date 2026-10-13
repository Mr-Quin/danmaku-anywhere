import type { ILogger } from '@/common/Logger'
import { ExtStorageService } from '@/common/storage/ExtStorageService'
import type { IStoreService } from './IStoreService'
import { isStoredAtVersion } from './OptionsService/storedVersion'
import type { Options, StoreSnapshot } from './OptionsService/types'

// Every store's envelope as it was before the first upgrade step persisted.
type PersistedSnapshot = Record<string, Options<unknown>>

const SNAPSHOT_KEY = 'optionsUpgradeSnapshot'

// Tries every store even after one fails, then rejects naming each store that
// did not persist. Steps that read other stores get the data from before the
// first attempt, even on a retry after some stores were already upgraded, so
// the snapshot is kept in storage until an attempt succeeds.
export async function upgradeStores(
  services: IStoreService[],
  logger: ILogger
): Promise<void> {
  const storage = new ExtStorageService<PersistedSnapshot>(SNAPSHOT_KEY, {
    storageType: 'local',
  })
  const snapshot = await loadSnapshot(services, storage)
  const stores: StoreSnapshot = {}
  for (const [key, stored] of Object.entries(snapshot)) {
    stores[key] = stored.data
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
  await storage.delete()
}

async function loadSnapshot(
  services: IStoreService[],
  storage: ExtStorageService<PersistedSnapshot>
): Promise<PersistedSnapshot> {
  const taken: PersistedSnapshot = {}
  let needsUpgrade = false
  for (const service of services) {
    const stored = await service.options.readStoredUnblocked()
    if (stored) {
      taken[service.options.key] = stored
    }
    if (!isStoredAtVersion(stored, service.options.latestVersion)) {
      needsUpgrade = true
    }
  }
  if (!needsUpgrade) {
    return taken
  }

  const kept = await storage.read()
  if (kept) {
    return kept
  }
  await storage.set(taken)
  return taken
}
