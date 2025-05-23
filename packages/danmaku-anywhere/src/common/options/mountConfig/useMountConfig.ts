import { useMutation } from '@tanstack/react-query'
import { useMemo } from 'react'

import type {
  MountConfig,
  MountConfigOptions,
} from '@/common/options/mountConfig/schema'
import { mountConfigService } from '@/common/options/mountConfig/service'
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
  const createMutation = useMutation({
    mutationKey: storageQueryKeys.external('sync', ['mountConfig']),
    mutationFn: mountConfigService.create.bind(mountConfigService),
  })

  const updateMutation = useMutation({
    mutationKey: storageQueryKeys.external('sync', ['mountConfig']),
    mutationFn: ({
      id,
      config,
    }: {
      id: string
      config: Partial<MountConfig>
    }) => mountConfigService.update(id, config),
  })

  const deleteMutation = useMutation({
    mutationKey: storageQueryKeys.external('sync', ['mountConfig']),
    mutationFn: mountConfigService.delete.bind(mountConfigService),
  })

  const setIntegrationMutation = useMutation({
    mutationKey: storageQueryKeys.external('sync', ['mountConfig']),
    mutationFn: (input: { configId: string; integrationId?: string }) => {
      return mountConfigService.setIntegration(
        input.configId,
        input.integrationId
      )
    },
  })

  return {
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
    setIntegration: setIntegrationMutation,
  }
}
