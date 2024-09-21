import type { UseSuspenseQueryOptions } from '@tanstack/react-query'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import type { ExtStorageServiceOptions } from '../ExtStorageService'
import { ExtStorageService } from '../ExtStorageService'

import { toArray } from '@/common/utils/utils'

interface UseSuspenseExtStorageOptions<T> extends ExtStorageServiceOptions {
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
    queryOptions,
    updateMutationOptions,
    deleteMutationOptions,
  }: UseSuspenseExtStorageOptions<T> = {}
) => {
  const queryKey = ['ext-storage', storageType, ...toArray(key)]

  const queryClient = useQueryClient()

  const storageService = useMemo(
    () => new ExtStorageService<T>(key, { storageType }),
    [...queryKey]
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      updateMutationOptions?.onSuccess?.()
    },
    onError: (error) => {
      updateMutationOptions?.onError?.(error)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: storageService.set.bind(storageService),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      deleteMutationOptions?.onSuccess?.()
    },
    onError: (error) => {
      deleteMutationOptions?.onError?.(error)
    },
  })

  return { ...query, update: updateMutation, remove: deleteMutation }
}
