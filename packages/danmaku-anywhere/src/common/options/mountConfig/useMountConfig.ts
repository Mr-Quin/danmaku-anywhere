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
import { createDownload } from '@/common/utils/utils'

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

    const exportConfigs = async () => {
      const { data: configs } = options

      return createDownload(
        new Blob([JSON.stringify(configs, null, 2)], { type: 'text/json' }),
        'config.json'
      )
    }

    return {
      matchByUrl,
      exportConfigs,
    }
  }, [options, update.mutateAsync])

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

  const importMutation = useMutation({
    mutationKey: storageQueryKeys.external('sync', ['mountConfig']),
    mutationFn: mountConfigService.import.bind(mountConfigService),
  })

  return {
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
    createMultiple: importMutation,
  }
}
