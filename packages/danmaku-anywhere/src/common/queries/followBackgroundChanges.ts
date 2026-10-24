import type {
  InvalidateQueryFilters,
  QueryClient,
  QueryKey,
} from '@tanstack/react-query'
import {
  type ManifestChange,
  subscribeDataChange,
} from '@/common/messaging/dataChangeChannel'
import {
  type ExtStorageType,
  getStorageArea,
} from '@/common/storage/getStorageArea'
import { toArray } from '@/common/utils/utils'
import { sourceQueryKeys, storageQueryKeys } from './queryKeys'

const STORAGE_TYPES: ExtStorageType[] = ['local', 'sync', 'session']

// Source capabilities are read from the stored configs and manifests. Content
// scripts get no manifest announcement, so the storage write is their signal.
const SOURCE_STORAGE_KEYS: Partial<Record<ExtStorageType, string>> = {
  sync: 'providerConfig',
  local: 'manifests',
}

type StorageChanges = Record<string, chrome.storage.StorageChange>

// Subscribe before any query reads. A change that lands between a query's
// first read and a later subscription is otherwise never seen.
export function followBackgroundChanges(client: QueryClient): () => void {
  const invalidator = createInvalidator(client)
  const unsubscribers = [
    invalidator.stop,
    subscribeDataChange((event) => {
      if (event.type === 'invalidateQueries') {
        for (const queryKey of event.keys) {
          invalidator.invalidate({ queryKey })
        }
        return
      }
      if (event.type === 'manifestsChanged') {
        for (const queryKey of keysAffectedBy(event)) {
          invalidator.invalidate({ queryKey })
        }
      }
    }),
    ...STORAGE_TYPES.map((storageType) => {
      return followStorageArea(invalidator, storageType)
    }),
  ]
  return () => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe()
    }
  }
}

function keysAffectedBy(change: ManifestChange): QueryKey[] {
  const keys: QueryKey[] = [sourceQueryKeys.manifestLists()]
  if (change.catalogChanged) {
    keys.push(sourceQueryKeys.pendingUpdates())
  }
  if (change.manifestIds.length > 0) {
    keys.push(sourceQueryKeys.capabilities())
  }
  for (const manifestId of change.manifestIds) {
    keys.push(
      sourceQueryKeys.manifestSpecs(manifestId),
      sourceQueryKeys.manifestSource(manifestId),
      sourceQueryKeys.loginStatus(manifestId)
    )
  }
  return keys
}

interface Invalidator {
  invalidate: (filters: InvalidateQueryFilters) => void
  stop: () => void
}

// invalidateQueries cannot restart a query's first fetch, and that fetch
// clears the stale mark when it lands with what it read before the change.
// Such queries are marked again once their fetch settles.
function createInvalidator(client: QueryClient): Invalidator {
  const cache = client.getQueryCache()
  const staleOnSettle = new Set<string>()
  const stop = cache.subscribe((event) => {
    if (event.type === 'removed') {
      staleOnSettle.delete(event.query.queryHash)
      return
    }
    if (event.type !== 'updated') {
      return
    }
    if (event.action.type !== 'success' && event.action.type !== 'error') {
      return
    }
    if (!staleOnSettle.delete(event.query.queryHash)) {
      return
    }
    void client.invalidateQueries({
      queryKey: event.query.queryKey,
      exact: true,
    })
  })
  return {
    invalidate: (filters) => {
      for (const query of cache.findAll(filters)) {
        const restartable = query.isActive() && query.state.data !== undefined
        if (query.state.fetchStatus === 'fetching' && !restartable) {
          staleOnSettle.add(query.queryHash)
        }
      }
      void client.invalidateQueries(filters)
    },
    stop,
  }
}

function followStorageArea(
  invalidator: Invalidator,
  storageType: ExtStorageType
): () => void {
  const area = getStorageArea(storageType)
  const listener = (changes: StorageChanges) => {
    const changed = new Set(Object.keys(changes))
    const sourceKey = SOURCE_STORAGE_KEYS[storageType]
    if (sourceKey !== undefined && changed.has(sourceKey)) {
      invalidator.invalidate({ queryKey: sourceQueryKeys.capabilities() })
    }
    invalidator.invalidate({
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

// An option store split over several items keeps its chunks under
// "<key>.<field>.<n>", and a write that only lands chunks still changes what
// a query of the store reads.
function readsAnyOf(queryKey: QueryKey, changed: Set<string>): boolean {
  const [head] = queryKey
  if (typeof head !== 'object' || head === null || !('key' in head)) {
    return false
  }
  return toArray(head.key).some((key) => {
    if (key === null) {
      return true
    }
    if (typeof key !== 'string') {
      return false
    }
    return [...changed].some((changedKey) => {
      return changedKey === key || changedKey.startsWith(`${key}.`)
    })
  })
}
