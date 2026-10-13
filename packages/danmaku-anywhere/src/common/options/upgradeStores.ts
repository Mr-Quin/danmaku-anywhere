import type { ILogger } from '@/common/Logger'
import type { IStoreService } from './IStoreService'
import { isStoredAtVersion } from './OptionsService/storedVersion'
import type { Options, StoreSnapshot } from './OptionsService/types'

// Every store's envelope, version included, as it was before the first
// upgrade step persisted.
export type UpgradeSnapshot = Record<string, Options<unknown>>

export interface UpgradeSnapshotStore {
  // The snapshot an earlier attempt of the same upgrade saved, if any
  kept: UpgradeSnapshot | undefined
  save(snapshot: UpgradeSnapshot): Promise<void>
}

// Tries every store even after one fails, then rejects naming each store that
// did not persist. Steps that read other stores get the data from before the
// first attempt, even on a retry after some stores were already upgraded. The
// snapshot is saved before the first write; the caller keeps it until an
// attempt succeeds.
export async function upgradeStores(
  services: IStoreService[],
  logger: ILogger,
  snapshots: UpgradeSnapshotStore
): Promise<void> {
  const current: UpgradeSnapshot = {}
  for (const service of services) {
    const stored = await service.options.readStoredUnblocked()
    if (stored) {
      current[service.options.key] = stored
    }
  }
  const needsUpgrade = services.some((service) => {
    const { key, latestVersion } = service.options
    return !isStoredAtVersion(current[key], latestVersion)
  })
  if (!needsUpgrade) {
    return
  }

  const { snapshot, changed } = reconcileSnapshot(
    snapshots.kept,
    current,
    services
  )
  if (changed) {
    await snapshots.save(snapshot)
  }
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
}

// A partial run of the same upgrade leaves each store either untouched since
// it was captured or at its latest version, and those captured entries are
// kept. A store that is neither, deleted by hand or synced from another
// device at some other version, is captured again from what is stored now.
function reconcileSnapshot(
  kept: UpgradeSnapshot | undefined,
  current: UpgradeSnapshot,
  services: IStoreService[]
): { snapshot: UpgradeSnapshot; changed: boolean } {
  if (!kept) {
    return { snapshot: current, changed: true }
  }
  const snapshot: UpgradeSnapshot = {}
  let changed = false
  for (const service of services) {
    const { key, latestVersion } = service.options
    const now = current[key]
    const captured = kept[key]
    const stillValid =
      isStoredAtVersion(now, latestVersion) || isSameVersion(now, captured)
    const entry = stillValid ? captured : now
    if (entry !== captured) {
      changed = true
    }
    if (entry) {
      snapshot[key] = entry
    }
  }
  return { snapshot, changed }
}

function isSameVersion(
  a: Options<unknown> | undefined,
  b: Options<unknown> | undefined
): boolean {
  if (!a || !b) {
    return a === b
  }
  return (a.version ?? 0) === (b.version ?? 0)
}
