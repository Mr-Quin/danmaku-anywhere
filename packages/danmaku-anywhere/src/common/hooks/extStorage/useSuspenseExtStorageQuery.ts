import type { UseSuspenseQueryOptions } from '@tanstack/react-query'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import type { ExtStorageServiceOptions } from '../../services/ExtStorageService'
import { ExtStorageService } from '../../services/ExtStorageService'

import { toArray } from '@/common/utils'

interface UseSuspenseExtStorageOptions<T> extends ExtStorageServiceOptions {
  queryOptions?: Omit<UseSuspenseQueryOptions<T>, 'queryKey' | 'queryFn'>
}

export const useSuspenseExtStorageQuery = <T>(
  key: string | string[] | null,
  { storageType = 'local', queryOptions }: UseSuspenseExtStorageOptions<T> = {}
) => {
  const queryKey = ['ext-storage', storageType, ...toArray(key)]

  const queryClient = useQueryClient()

  const storageService = useMemo(
    () => new ExtStorageService<T>(key, { storageType }),
    [...queryKey]
  )

  useEffect(() => {
    storageService.subscribe(() => {
      queryClient.invalidateQueries({ queryKey })
    })

    return () => {
      queryClient.invalidateQueries({ queryKey })
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
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: storageService.set.bind(storageService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  return { ...query, update: updateMutation, remove: deleteMutation }
}
