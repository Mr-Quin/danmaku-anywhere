import { getStorageArea } from '@/common/storage/getStorageArea'
import { OptionsStorageError } from '../OptionsService/OptionsStorageError'
import { isStoredAtVersion } from '../OptionsService/storedVersion'
import { decodeEnvelope, layoutItems } from '../OptionsService/storeLayout'
import type { OptionStoreDescriptor } from '../optionStores'
import { UPGRADE_RUN_KEY, type UpgradeRun } from '../upgrade/upgradeRun'

export interface OptionStoresStatus {
  // Every store is stored whole at its latest version
  current: boolean
  run: UpgradeRun | undefined
  // Keys of the stores split over several items that do not add up, which
  // every read of them rejects
  incomplete: string[]
}

// One read per storage area, whatever the number of stores.
export async function readOptionStoresStatus(
  stores: readonly OptionStoreDescriptor[]
): Promise<OptionStoresStatus> {
  const inArea = (area: 'sync' | 'local') => {
    return stores.filter((store) => store.area === area)
  }
  const [sync, local] = await Promise.all([
    readArea('sync', inArea('sync')),
    readArea('local', inArea('local'), [UPGRADE_RUN_KEY]),
  ])
  const stored = { sync, local }

  const incomplete: string[] = []
  const atLatest = stores.map((store) => {
    const items = stored[store.area]
    try {
      const envelope = decodeEnvelope(store, layoutItems(store, items))
      return isStoredAtVersion(envelope, store.latestVersion)
    } catch (error) {
      if (!(error instanceof OptionsStorageError)) {
        throw error
      }
      incomplete.push(store.key)
      return false
    }
  })

  return {
    current: atLatest.every(Boolean),
    run: local[UPGRADE_RUN_KEY] as UpgradeRun | undefined,
    incomplete,
  }
}

// A store that can be split is read with the whole area, since its chunk
// keys are only known from what is stored.
async function readArea(
  area: 'sync' | 'local',
  stores: readonly OptionStoreDescriptor[],
  extraKeys: string[] = []
): Promise<Record<string, unknown>> {
  if (stores.some((store) => (store.parts ?? []).length > 0)) {
    return getStorageArea(area).get(null)
  }
  const keys = [...stores.map((store) => store.key), ...extraKeys]
  if (keys.length === 0) {
    return {}
  }
  return getStorageArea(area).get(keys)
}
