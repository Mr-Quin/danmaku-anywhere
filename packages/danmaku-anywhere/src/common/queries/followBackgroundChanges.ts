import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { subscribeDataChange } from '@/common/messaging/dataChangeChannel'
import {
  type ExtStorageType,
  getStorageArea,
} from '@/common/storage/getStorageArea'
import { toArray } from '@/common/utils/utils'
import { sourceQueryKeys, storageQueryKeys } from './queryKeys'

const STORAGE_TYPES: ExtStorageType[] = ['local', 'sync', 'session']

type StorageChanges = Record<string, chrome.storage.StorageChange>

// Subscribe before any query reads. A change that lands between a query's
// first read and a later subscription is otherwise never seen.
export function followBackgroundChanges(client: QueryClient): () => void {
  const unsubscribers = [
    subscribeDataChange((event) => {
      if (event.type === 'invalidateQueries') {
        invalidateAll(client, event.keys)
        return
      }
      if (event.type === 'manifestsChanged') {
        invalidateAll(client, [sourceQueryKeys.all()])
      }
    }),
    ...STORAGE_TYPES.map((storageType) => {
      return followStorageArea(client, storageType)
    }),
  ]
  return () => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe()
    }
  }
}

function invalidateAll(client: QueryClient, keys: QueryKey[]): void {
  for (const queryKey of keys) {
    void client.invalidateQueries({ queryKey })
  }
}

function followStorageArea(
  client: QueryClient,
  storageType: ExtStorageType
): () => void {
  const area = getStorageArea(storageType)
  const listener = (changes: StorageChanges) => {
    const changed = new Set(Object.keys(changes))
    void client.invalidateQueries({
      queryKey: storageQueryKeys.area(storageType),
      predicate: (query) => {
        return readsAnyOf(query.queryKey, changed)
      },
    })
  }
  area.onChanged.addListener(listener)
  return () => {
    area.onChanged.removeListener(listener)
  }
}

function readsAnyOf(queryKey: QueryKey, changed: Set<string>): boolean {
  const [head] = queryKey
  if (typeof head !== 'object' || head === null || !('key' in head)) {
    return false
  }
  return toArray(head.key).some((key) => {
    return key === null || (typeof key === 'string' && changed.has(key))
  })
}
