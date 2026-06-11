import { arrayMove } from '@dnd-kit/sortable'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useInjectService } from '@/common/hooks/useInjectService'
import { bookmarkQueryKeys, storageQueryKeys } from '@/common/queries/queryKeys'
import { useSuspenseExtStorageQuery } from '@/common/storage/hooks/useSuspenseExtStorageQuery'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
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

    const getProviderById = (id: string) => {
      return configs.find((config) => config.id === id)
    }

    return {
      enabledProviders,
      getProviderById,
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
    mutationFn: (input: unknown) => providerConfigService.create(input),
    onSuccess: (config) => {
      getTrackingService().track('providerConfigCreate', {
        manifestId: config.manifestId,
      })
    },
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
    onSuccess: (config) => {
      getTrackingService().track('providerConfigUpdate', {
        manifestId: config.manifestId,
      })
    },
    meta,
  })

  const deleteMutation = useMutation({
    mutationFn: providerConfigService.delete.bind(providerConfigService),
    onMutate: async (id: string) => {
      const config = await providerConfigService.get(id)
      return { manifestId: config?.manifestId }
    },
    onSuccess: (_, __, context) => {
      if (context?.manifestId) {
        getTrackingService().track('providerConfigDelete', {
          manifestId: context.manifestId,
        })
      }
    },
    // Deleting a config also deletes its bookmarks in the background, so the
    // bookmark cache must refetch or the tree keeps showing dead stubs.
    meta: { invalidates: [queryKey, bookmarkQueryKeys.all()] },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled?: boolean }) =>
      providerConfigService.toggle(id, enabled),
    onSuccess: (config) => {
      getTrackingService().track('providerConfigToggle', {
        manifestId: config.manifestId,
      })
    },
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

  const reorderAllMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      providerConfigService.setOrder(orderedIds),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData =
        queryClient.getQueryData<ProviderConfigOptions>(queryKey)
      if (previousData) {
        const byId = new Map(previousData.data.map((c) => [c.id, c]))
        const reordered = orderedIds
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
    update: updateMutation,
    remove: deleteMutation,
    toggle: toggleMutation,
    reorder: reorderMutation,
    reorderAll: reorderAllMutation,
  }
}
