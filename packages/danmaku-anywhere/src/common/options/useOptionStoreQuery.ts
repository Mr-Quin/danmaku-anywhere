import { use } from 'react'
import { useInjectService } from '@/common/hooks/useInjectService'
import { useSuspenseExtStorageQuery } from '@/common/storage/hooks/useSuspenseExtStorageQuery'
import type { OptionStoreDescriptor } from './optionStores'
import { ReadinessService } from './ReadinessService/ReadinessService'

// Reads an option store's envelope, suspending until every store has been
// upgraded so the UI never reads or writes a store in its old shape.
export function useOptionStoreQuery<TEnvelope>(store: OptionStoreDescriptor) {
  const readiness = useInjectService(ReadinessService)
  // Always the same promise, so once it has resolved React reads it without
  // suspending, and the hook calls use() on every render as React requires.
  use(readiness.waitUntilReady())
  return useSuspenseExtStorageQuery<TEnvelope>(store.key, {
    storageType: store.area,
  })
}
