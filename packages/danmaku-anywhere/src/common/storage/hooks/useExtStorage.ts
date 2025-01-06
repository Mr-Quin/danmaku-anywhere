import type { UseQueryOptions } from '@tanstack/react-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import type { ExtStorageServiceOptions } from '../ExtStorageService'
import { ExtStorageService } from '../ExtStorageService'

import { storageQueryKeys } from '@/common/queries/queryKeys'
import { toArray } from '@/common/utils/utils'

interface UseExtStorageOptions<T> extends ExtStorageServiceOptions {
  queryOptions?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
}

export const useExtStorage = <T>(
  key: string | string[] | null,
  { storageType = 'local', queryOptions }: UseExtStorageOptions<T> = {}
) => {
  const effectKey = ['ext-storage', storageType, ...toArray(key)]
  const queryKey = storageQueryKeys.external(storageType, toArray(key))

  const queryClient = useQueryClient()

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
      void queryClient.invalidateQueries({ queryKey })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: storageService.set.bind(storageService),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    ...query,
    update: updateMutation,
    remove: deleteMutation,
  }
}
