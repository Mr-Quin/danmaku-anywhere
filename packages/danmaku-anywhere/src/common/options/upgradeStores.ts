import type { ILogger } from '@/common/Logger'
import type { IStoreService } from './IStoreService'
import { isStoredAtVersion } from './OptionsService/storedVersion'
import type { Options, StoreSnapshot } from './OptionsService/types'

// Each store's envelope, version included, as it was before the first
// upgrade step persisted, and the version that upgrade was taking it to.
export interface SnapshotEntry {
  stored?: Options<unknown>
  target: number
}

export type UpgradeSnapshot = Record<string, SnapshotEntry>

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
  const current: Record<string, Options<unknown>> = {}
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
  for (const [key, entry] of Object.entries(snapshot)) {
    if (entry.stored) {
      stores[key] = entry.stored.data
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

// A snapshot belongs to one build's upgrade: a later build has other targets,
// and its upgrade starts from what is stored now, even if the earlier run
// succeeded but could not delete its snapshot. Within the same upgrade, a
// partial run leaves each store either untouched since it was captured or at
// its latest version, and those captured entries are kept. A store that is
// neither, deleted by hand or synced from another device at some other
// version, is captured again from what is stored now.
function reconcileSnapshot(
  kept: UpgradeSnapshot | undefined,
  current: Record<string, Options<unknown>>,
  services: IStoreService[]
): { snapshot: UpgradeSnapshot; changed: boolean } {
  const fresh = (service: IStoreService): SnapshotEntry => {
    const { key, latestVersion } = service.options
    return { stored: current[key], target: latestVersion }
  }
  const sameBuild = services.every((service) => {
    return kept?.[service.options.key]?.target === service.options.latestVersion
  })
  if (!kept || !sameBuild) {
    return {
      snapshot: Object.fromEntries(
        services.map((service) => [service.options.key, fresh(service)])
      ),
      changed: true,
    }
  }

  const snapshot: UpgradeSnapshot = {}
  let changed = false
  for (const service of services) {
    const { key, latestVersion } = service.options
    const now = current[key]
    const captured = kept[key]
    const stillValid =
      captured.target === latestVersion &&
      (isStoredAtVersion(now, latestVersion) ||
        isSameVersion(now, captured.stored))
    snapshot[key] = stillValid ? captured : fresh(service)
    if (!stillValid) {
      changed = true
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
