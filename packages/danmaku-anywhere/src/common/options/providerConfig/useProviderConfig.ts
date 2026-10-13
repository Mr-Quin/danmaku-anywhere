import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { bookmarkQueryKeys, storageQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useSuspenseExtStorageQuery } from '@/common/storage/hooks/useSuspenseExtStorageQuery'
import type {
  ProviderConfig,
  ProviderConfigDraft,
  ProviderConfigEdit,
  ProviderConfigOptions,
} from './schema'

// Read-only: the store's writes go through useEditProviderConfig.
export const useProviderConfig = () => {
  const { data: options } = useSuspenseExtStorageQuery<ProviderConfigOptions>(
    'providerConfig',
    {
      storageType: 'sync',
      isOptionStore: true,
    }
  )

  const configs = options.data

  return useMemo(() => {
    const enabledProviders = configs.filter((config) => config.enabled)

    const getProviderById = (id: string) => {
      return configs.find((config) => config.id === id)
    }

    return {
      configs,
      enabledProviders,
      getProviderById,
    }
  }, [configs])
}

export const useEditProviderConfig = () => {
  const queryClient = useQueryClient()
  const queryKey = storageQueryKeys.external('sync', ['providerConfig'])
  const meta = { invalidates: [queryKey] }

  const createMutation = useMutation({
    mutationFn: async (draft: ProviderConfigDraft) => {
      return (await chromeRpcClient.providerConfigCreate(draft)).data
    },
    meta,
  })

  const addBuiltinMutation = useMutation({
    mutationFn: async (manifestId: string) => {
      const res = await chromeRpcClient.providerConfigAddBuiltin({ manifestId })
      return res.data
    },
    meta,
  })

  const updateMutation = useMutation({
    mutationFn: async (input: { id: string; edit: ProviderConfigEdit }) => {
      return (await chromeRpcClient.providerConfigUpdate(input)).data
    },
    meta,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await chromeRpcClient.providerConfigDelete(id)
    },
    // Deleting a config also deletes its bookmarks in the background, so the
    // bookmark cache must refetch or the tree keeps showing dead stubs.
    meta: { invalidates: [queryKey, bookmarkQueryKeys.all()] },
  })

  const setEnabledMutation = useMutation({
    mutationFn: async (input: { id: string; enabled: boolean }) => {
      return (await chromeRpcClient.providerConfigSetEnabled(input)).data
    },
    meta,
  })

  const setOrderMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await chromeRpcClient.providerConfigSetOrder({ ids })
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData =
        queryClient.getQueryData<ProviderConfigOptions>(queryKey)
      if (previousData) {
        const byId = new Map(previousData.data.map((c) => [c.id, c]))
        const reordered = ids
          .map((id) => byId.get(id))
          .filter((c): c is ProviderConfig => c !== undefined)
        queryClient.setQueryData(queryKey, { ...previousData, data: reordered })
      }
      return { previousData }
    },
    onError: (_, __, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    create: createMutation,
    addBuiltin: addBuiltinMutation,
    update: updateMutation,
    remove: deleteMutation,
    setEnabled: setEnabledMutation,
    setOrder: setOrderMutation,
  }
}
