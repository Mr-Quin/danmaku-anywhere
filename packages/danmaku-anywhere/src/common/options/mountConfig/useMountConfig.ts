import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import type {
  MountConfig,
  MountConfigOptions,
} from '@/common/options/mountConfig/schema'
import { mountConfigService } from '@/common/options/mountConfig/service'
import { storageQueryKeys } from '@/common/queries/queryKeys'
import { useSuspenseExtStorageQuery } from '@/common/storage/hooks/useSuspenseExtStorageQuery'
import { matchUrl } from '@/common/utils/matchUrl'

const arrayMove = <T>(array: T[], from: number, to: number): T[] => {
  const newArray = [...array]
  const item = newArray.splice(from, 1)[0]
  newArray.splice(to, 0, item)
  return newArray
}

export const useMountConfig = () => {
  const {
    data: options,
    update,
    ...rest
  } = useSuspenseExtStorageQuery<MountConfigOptions>('mountConfig', {
    storageType: 'sync',
  })

  const methods = useMemo(() => {
    const matchByUrl = (url: string) => {
      const { data: configs } = options

      return configs
        .filter((config) => config.enabled)
        .find((config) => {
          const { patterns } = config
          return patterns.some((pattern) => matchUrl(url, pattern))
        })
    }

    return {
      matchByUrl,
    }
  }, [options])

  const configs: MountConfig[] = options.data

  return {
    ...rest,
    update,
    configs,
    ...methods,
  }
}

export const useEditMountConfig = () => {
  const queryClient = useQueryClient()
  const queryKey = storageQueryKeys.external('sync', ['mountConfig'])

  const createMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: mountConfigService.create.bind(mountConfigService),
  })

  const updateMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: ({
      id,
      config,
    }: {
      id: string
      config: Partial<MountConfig>
    }) => mountConfigService.update(id, config),
  })

  const deleteMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: mountConfigService.delete.bind(mountConfigService),
  })

  const setIntegrationMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: (input: { configId: string; integrationId?: string }) => {
      return mountConfigService.setIntegration(
        input.configId,
        input.integrationId
      )
    },
  })

  const reorderMutation = useMutation({
    mutationKey: queryKey,
    mutationFn: (input: { sourceIndex: number; destinationIndex: number }) => {
      return mountConfigService.reorder(
        input.sourceIndex,
        input.destinationIndex
      )
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey })

      const previousData =
        queryClient.getQueryData<MountConfigOptions>(queryKey)

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
    setIntegration: setIntegrationMutation,
    reorder: reorderMutation,
    setMode: (input: { id: string; mode: 'manual' | 'ai' | 'custom' }) =>
      updateMutation.mutateAsync({
        id: input.id,
        config: { mode: input.mode },
      }),
  }
}
