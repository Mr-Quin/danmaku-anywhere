import type { UseSuspenseQueryOptions } from '@tanstack/react-query'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useInjectService } from '@/common/hooks/useInjectService'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { storageQueryKeys } from '@/common/queries/queryKeys'
import { toArray } from '@/common/utils/utils'
import type { ExtStorageServiceOptions } from '../ExtStorageService'
import { ExtStorageService } from '../ExtStorageService'

interface UseSuspenseExtStorageOptions<T> extends ExtStorageServiceOptions {
  // The background upgrade rewrites option stores in place, so reading one
  // before it finishes would hand the UI the previous version's shape.
  isOptionStore?: boolean
  queryOptions?: Omit<UseSuspenseQueryOptions<T>, 'queryKey' | 'queryFn'>
  updateMutationOptions?: {
    onSuccess?: () => void
    onError?: (error: Error) => void
  }
  deleteMutationOptions?: {
    onSuccess?: () => void
    onError?: (error: Error) => void
  }
}

export const useSuspenseExtStorageQuery = <T>(
  key: string | string[] | null,
  {
    storageType = 'local',
    isOptionStore = false,
    queryOptions,
    updateMutationOptions,
    deleteMutationOptions,
  }: UseSuspenseExtStorageOptions<T> = {}
) => {
  const effectKey = ['ext-storage', storageType, ...toArray(key)]
  const queryKey = storageQueryKeys.external(storageType, toArray(key))

  const queryClient = useQueryClient()
  const readinessService = useInjectService(ReadinessService)

  const storageService = useMemo(
    () => new ExtStorageService<T>(key, { storageType }),
    [...effectKey]
  )

  useEffect(() => {
    storageService.subscribe(() => {
      void queryClient.invalidateQueries({ queryKey })
    })
    storageService.setup()

    return () => {
      void queryClient.invalidateQueries({ queryKey })
      storageService.destroy()
    }
  }, [storageService, queryClient])

  const query = useSuspenseQuery({
    queryKey,
    queryFn: async () => {
      if (isOptionStore) {
        await readinessService.waitUntilReady()
      }
      const res = await storageService.read()

      if (res === undefined) {
        // useQuery requires non-undefined return value
        throw new Error('Failed to read from storage, result is undefined')
      }

      return res
    },
    ...queryOptions,
  })

  const updateMutation = useMutation({
    mutationFn: storageService.set.bind(storageService),
    meta: { invalidates: [queryKey] },
    onSuccess: () => {
      updateMutationOptions?.onSuccess?.()
    },
    onError: (error) => {
      updateMutationOptions?.onError?.(error)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: storageService.set.bind(storageService),
    meta: { invalidates: [queryKey] },
    onSuccess: () => {
      deleteMutationOptions?.onSuccess?.()
    },
    onError: (error) => {
      deleteMutationOptions?.onError?.(error)
    },
  })

  return { ...query, update: updateMutation, remove: deleteMutation }
}
