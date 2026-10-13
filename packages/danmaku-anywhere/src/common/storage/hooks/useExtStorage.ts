import type { UseQueryOptions } from '@tanstack/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { storageQueryKeys } from '@/common/queries/queryKeys'
import { toArray } from '@/common/utils/utils'
import type { ExtStorageServiceOptions } from '../ExtStorageService'
import { ExtStorageService } from '../ExtStorageService'

interface UseExtStorageOptions<T> extends ExtStorageServiceOptions {
  queryOptions?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
}

export const useExtStorage = <T>(
  key: string | string[] | null,
  { storageType = 'local', queryOptions }: UseExtStorageOptions<T> = {}
) => {
  const effectKey = ['ext-storage', storageType, ...toArray(key)]
  const queryKey = storageQueryKeys.external(storageType, toArray(key))

  const storageService = useMemo(
    () => new ExtStorageService<T>(key, { storageType }),
    [...effectKey]
  )

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

  const meta = { invalidates: [queryKey] }

  const updateMutation = useMutation({
    mutationFn: storageService.set.bind(storageService),
    meta,
  })

  const deleteMutation = useMutation({
    mutationFn: storageService.set.bind(storageService),
    meta,
  })

  return {
    ...query,
    update: updateMutation,
    remove: deleteMutation,
  }
}
