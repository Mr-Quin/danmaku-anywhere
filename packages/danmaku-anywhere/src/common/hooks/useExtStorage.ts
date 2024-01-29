import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import {
  ExtStorageService,
  ExtStorageServiceOptions,
} from '../services/ExtStorageService'

import { toArray } from '@/common/utils'

// required for useQuery to accept placeholderData
// eslint-disable-next-line @typescript-eslint/ban-types
type NonFunctionGuard<T> = T extends Function ? never : T

interface UseExtStorageOptions<T> extends ExtStorageServiceOptions {
  placeholderData?: T
}

export const useExtStorage = <T>(
  key: string | string[] | null,
  { storageType = 'local', placeholderData }: UseExtStorageOptions<T> = {}
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
    queryFn: storageService.read.bind(storageService), // useQuery requires non-undefined return value
    placeholderData: placeholderData as NonFunctionGuard<T>,
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
