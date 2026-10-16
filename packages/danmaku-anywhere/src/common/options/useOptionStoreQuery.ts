import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { use, useMemo } from 'react'
import { useToast } from '@/common/components/Toast/toastStore'
import { describeError } from '@/common/errors/describeError'
import { useInjectService } from '@/common/hooks/useInjectService'
import { storageQueryKeys } from '@/common/queries/queryKeys'
import { OptionsStorage } from './OptionsService/OptionsStorage'
import { storageProblemOf } from './OptionsService/storageProblem'
import type { Options } from './OptionsService/types'
import type { OptionStoreDescriptor } from './optionStores'
import { ReadinessService } from './ReadinessService/ReadinessService'

// Reads an option store's envelope, suspending until every store has been
// upgraded so the UI never reads or writes a store in its old shape. A write
// the browser's storage quota refuses is reported in a toast.
export function useOptionStoreQuery<T>(store: OptionStoreDescriptor) {
  const readiness = useInjectService(ReadinessService)
  const { toast } = useToast()
  // Always the same promise, so once it has resolved React reads it without
  // suspending, and the hook calls use() on every render as React requires.
  use(readiness.waitUntilReady())

  const storage = useMemo(() => {
    return new OptionsStorage<T>(store)
  }, [store])
  const queryKey = storageQueryKeys.external(store.area, [store.key])

  const query = useSuspenseQuery({
    queryKey,
    queryFn: async (): Promise<Options<T>> => {
      const envelope = await storage.read()
      // useQuery does not accept undefined as data
      if (envelope === undefined) {
        throw new Error(`Option store ${store.key} is not stored`)
      }
      return envelope
    },
  })

  const update = useMutation({
    mutationFn: (envelope: Options<T>) => storage.write(envelope),
    meta: { invalidates: [queryKey] },
    onError: (error) => {
      if (storageProblemOf(error) !== undefined) {
        toast.error(describeError(error).message)
      }
    },
  })

  return { ...query, update }
}
