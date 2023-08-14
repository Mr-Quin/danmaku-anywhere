import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toArray } from '@/common/utils'

export type StorageType = 'local' | 'sync' | 'session'

export type StorageConfig = {
  storageType?: StorageType
  placeholderData?: { [key: string]: any }
}

export const useExtStorage = <T>(
  key: string | string[] | null,
  { storageType = 'local', placeholderData = {} }: StorageConfig = {}
) => {
  const storage = chrome.storage[storageType]

  const queryKey = ['ext-storage', storageType, ...toArray(key)]

  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey,
    queryFn: () => {
      return storage.get(key)
    },
    select: (data) => {
      if (key === null) return data as T
      if (Array.isArray(key)) return data as T
      return data[key] as T
    },
    placeholderData,
  })

  const updateMutation = useMutation({
    mutationFn: async (value: T) => {
      if (key === null || Array.isArray(key)) throw new Error('invalid key')
      return storage.set({ [key]: value })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (key === null) return storage.clear()
      return storage.remove(key)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  useEffect(() => {
    // listen to storage change from elsewhere and update state
    if (typeof key !== 'string') return

    const listener = (changes: {
      [p: string]: chrome.storage.StorageChange
    }) => {
      const change = changes[key]
      if (change) {
        queryClient.invalidateQueries({ queryKey })
      }
    }
    storage.onChanged.addListener(listener)

    return () => {
      storage.onChanged.removeListener(listener)
    }
  }, [...queryKey])

  return {
    ...query,
    update: updateMutation,
    remove: deleteMutation,
  }
}
