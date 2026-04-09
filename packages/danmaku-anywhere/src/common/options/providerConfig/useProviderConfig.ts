import { arrayMove } from '@dnd-kit/sortable'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { DanmakuSourceType } from '@/common/danmaku/enums'
import { useInjectService } from '@/common/hooks/useInjectService'
import { storageQueryKeys } from '@/common/queries/queryKeys'
import { useSuspenseExtStorageQuery } from '@/common/storage/hooks/useSuspenseExtStorageQuery'
import type { ProviderConfig, ProviderConfigOptions } from './schema'
import { ProviderConfigService } from './service'

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
  const meta = { invalidates: [queryKey] }

  const providerConfigService = useInjectService(ProviderConfigService)

  const createMutation = useMutation({
    mutationFn: providerConfigService.create.bind(providerConfigService),
    meta,
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      config,
    }: {
      id: string
      config: Partial<ProviderConfig>
    }) => providerConfigService.update(id, config),
    meta,
  })

  const deleteMutation = useMutation({
    mutationFn: providerConfigService.delete.bind(providerConfigService),
    meta,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled?: boolean }) =>
      providerConfigService.toggle(id, enabled),
    meta,
  })

  const reorderMutation = useMutation({
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
    update: updateMutation,
    remove: deleteMutation,
    toggle: toggleMutation,
    reorder: reorderMutation,
  }
}
