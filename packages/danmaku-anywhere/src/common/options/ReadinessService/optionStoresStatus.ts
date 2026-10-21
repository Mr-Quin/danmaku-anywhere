import { getStorageArea } from '@/common/storage/getStorageArea'
import { isStoredAtVersion } from '../OptionsService/storedVersion'
import type { OptionStoreDescriptor } from '../optionStores'
import { UPGRADE_RUN_KEY, type UpgradeRun } from '../upgrade/upgradeRun'

export interface OptionStoresStatus {
  // Every store is stored at its latest version
  current: boolean
  run: UpgradeRun | undefined
}

// One read per storage area, whatever the number of stores.
export async function readOptionStoresStatus(
  stores: readonly OptionStoreDescriptor[]
): Promise<OptionStoresStatus> {
  const syncKeys = stores
    .filter((store) => store.area === 'sync')
    .map((store) => store.key)
  const localKeys = stores
    .filter((store) => store.area === 'local')
    .map((store) => store.key)

  const [sync, local] = await Promise.all([
    readArea('sync', syncKeys),
    readArea('local', [...localKeys, UPGRADE_RUN_KEY]),
  ])
  const stored = { sync, local }

  return {
    current: stores.every((store) => {
      return isStoredAtVersion(
        stored[store.area][store.key],
        store.latestVersion
      )
    }),
    run: local[UPGRADE_RUN_KEY] as UpgradeRun | undefined,
  }
}

async function readArea(
  area: 'sync' | 'local',
  keys: string[]
): Promise<Record<string, unknown>> {
  if (keys.length === 0) {
    return {}
  }
  return getStorageArea(area).get(keys)
}
