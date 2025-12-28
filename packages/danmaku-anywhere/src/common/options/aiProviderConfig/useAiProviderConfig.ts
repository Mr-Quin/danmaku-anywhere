import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useInjectService } from '@/common/hooks/useInjectService'
import { storageQueryKeys } from '@/common/queries/queryKeys'
import { useSuspenseExtStorageQuery } from '@/common/storage/hooks/useSuspenseExtStorageQuery'
import type { AiProviderConfig, AiProviderConfigOptions } from './schema'
import { AiProviderConfigService } from './service'

const arrayMove = <T>(array: T[], from: number, to: number): T[] => {
  const newArray = [...array]
  const item = newArray.splice(from, 1)[0]
  newArray.splice(to, 0, item)
  return newArray
}

export const useAiProviderConfig = () => {
  const {
    data: options,
    update,
    ...rest
  } = useSuspenseExtStorageQuery<AiProviderConfigOptions>('aiProviderConfig', {
    storageType: 'sync',
  })

  const configs: AiProviderConfig[] = options.data || []

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

export const useEditAiProviderConfig = () => {
  const queryClient = useQueryClient()
  const queryKey = storageQueryKeys.external('sync', ['aiProviderConfig'])

  const service = useInjectService(AiProviderConfigService)

  const createMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: service.create.bind(service),
  })

  const updateMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: ({
      id,
      config,
    }: {
      id: string
      config: Partial<AiProviderConfig>
    }) => service.update(id, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const deleteMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: service.delete.bind(service),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const toggleMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: async ({ id, enabled }: { id: string; enabled?: boolean }) => {
      const config = await service.get(id)
      if (!config) return
      return service.update(id, { enabled: enabled ?? !config.enabled })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const reorderMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: async ({
      sourceIndex,
      destinationIndex,
    }: {
      sourceIndex: number
      destinationIndex: number
    }) => {
      const configs = await service.options.get()
      const newConfigs = arrayMove(configs, sourceIndex, destinationIndex)
      await service.options.set(newConfigs)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
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
