import { arrayMove } from '@dnd-kit/sortable'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useInjectService } from '@/common/hooks/useInjectService'
import type {
  AutomationMode,
  MountConfig,
  MountConfigOptions,
} from '@/common/options/mountConfig/schema'
import { MountConfigService } from '@/common/options/mountConfig/service'
import { storageQueryKeys } from '@/common/queries/queryKeys'
import { useSuspenseExtStorageQuery } from '@/common/storage/hooks/useSuspenseExtStorageQuery'
import { matchUrl } from '@/common/utils/matchUrl'

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
  const meta = { invalidates: [queryKey] }

  const mountConfigService = useInjectService(MountConfigService)

  const createMutation = useMutation({
    mutationFn: mountConfigService.create.bind(mountConfigService),
    meta,
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      config,
    }: {
      id: string
      config: Partial<MountConfig>
    }) => mountConfigService.update(id, config),
    meta,
  })

  const deleteMutation = useMutation({
    mutationFn: mountConfigService.delete.bind(mountConfigService),
    meta,
  })

  const setIntegrationMutation = useMutation({
    mutationFn: (input: { configId: string; integrationId?: string }) => {
      return mountConfigService.setIntegration(
        input.configId,
        input.integrationId
      )
    },
    meta,
  })

  const reorderMutation = useMutation({
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

  const changeModeMutation = useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: AutomationMode }) =>
      mountConfigService.changeMode(id, mode),
    meta,
  })

  return {
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
    setIntegration: setIntegrationMutation,
    reorder: reorderMutation,
    setMode: changeModeMutation,
  }
}
