import {
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import {
  ExtStorageService,
  ExtStorageServiceOptions,
} from '../services/ExtStorageService'

import { toArray } from '@/common/utils'

interface UseExtStorageOptions<T> extends ExtStorageServiceOptions {
  queryOptions?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
}

export const useExtStorage = <T>(
  key: string | string[] | null,
  { storageType = 'local', queryOptions }: UseExtStorageOptions<T> = {}
) => {
  const queryKey = ['ext-storage', storageType, ...toArray(key)]

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
  }, [storageService])

  const queryClient = useQueryClient()

  const query = useQuery({
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

  return {
    ...query,
    isLoading: query.isLoading || updateMutation.isPending,
    update: updateMutation,
    remove: deleteMutation,
  }
}
