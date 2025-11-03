import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { DanmakuSourceType } from '@/common/danmaku/enums'
import { storageQueryKeys } from '@/common/queries/queryKeys'
import { useSuspenseExtStorageQuery } from '@/common/storage/hooks/useSuspenseExtStorageQuery'
import type { ProviderConfig, ProviderConfigOptions } from './schema'
import { providerConfigService } from './service'

const arrayMove = <T>(array: T[], from: number, to: number): T[] => {
  const newArray = [...array]
  const item = newArray.splice(from, 1)[0]
  newArray.splice(to, 0, item)
  return newArray
}

export const useProviderConfig = () => {
  const {
    data: options,
    update,
    ...rest
  } = useSuspenseExtStorageQuery<ProviderConfigOptions>('providerConfig', {
    storageType: 'sync',
  })

  const configs: ProviderConfig[] = options.data

  const methods = useMemo(() => {
    const enabledProviders = configs.filter((config) => config.enabled)

    const enabledProviderTypes = enabledProviders.map((config) => config.impl)

    const getProviderById = (id: string) => {
      return configs.find((config) => config.id === id)
    }

    const getProvidersBySourceType = (sourceType: DanmakuSourceType) => {
      return configs.filter((config) => config.impl === sourceType)
    }

    return {
      enabledProviders,
      enabledProviderTypes,
      getProviderById,
      getProvidersBySourceType,
    }
  }, [configs])

  return {
    ...rest,
    update,
    configs,
    ...methods,
  }
}

export const useEditProviderConfig = () => {
  const queryClient = useQueryClient()
  const queryKey = storageQueryKeys.external('sync', ['providerConfig'])

  const createMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: providerConfigService.create.bind(providerConfigService),
  })

  const updateMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: ({
      id,
      config,
    }: {
      id: string
      config: Partial<ProviderConfig>
    }) => providerConfigService.update(id, config),
  })

  const deleteMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: providerConfigService.delete.bind(providerConfigService),
  })

  const toggleMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: ({ id, enabled }: { id: string; enabled?: boolean }) =>
      providerConfigService.toggle(id, enabled),
  })

  const reorderMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: (input: { sourceIndex: number; destinationIndex: number }) => {
      return providerConfigService.reorder(
        input.sourceIndex,
        input.destinationIndex
      )
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey })

      const previousData =
        queryClient.getQueryData<ProviderConfigOptions>(queryKey)

      // Optimistically update the cache
      if (previousData) {
        const newData = {
          ...previousData,
          data: arrayMove(
            previousData.data,
            variables.sourceIndex,
            variables.destinationIndex
          ),
        }
        queryClient.setQueryData(queryKey, newData)
      }

      // Return a context object so we can roll back if needed
      return { previousData }
    },
    onError: (_, __, context) => {
      // Revert optimistic update if the mutation fails
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
    },
    onSettled: () => {
      // Sync state
      void queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
    toggle: toggleMutation,
    reorder: reorderMutation,
  }
}
