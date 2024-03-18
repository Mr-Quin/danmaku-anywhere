import { useMemo } from 'react'

import { useSuspenseExtStorageQuery } from '../extStorage/useSuspenseExtStorageQuery'

import type {
  MountConfigOptions,
  MountConfigWithoutId,
} from '@/common/constants/mountConfig'
import {
  hasOriginPermission,
  matchUrl,
  removeOriginPermission,
  requestOriginPermission,
  tryCatch,
} from '@/common/utils'

const isPermissionGranted = async (patterns: string[]) => {
  if (!(await hasOriginPermission(patterns))) {
    // request permission if not granted
    // if user denies permission, do not save
    if (!(await requestOriginPermission(patterns))) {
      return false
    }
  }
  return true
}

export const useMountConfig = () => {
  const {
    data: options,
    update,
    ...rest
  } = useSuspenseExtStorageQuery<MountConfigOptions>('mountConfig', {
    storageType: 'sync',
  })

  const { updateConfig, addConfig, deleteConfig, matchByUrl } = useMemo(() => {
    const updateConfig = async (
      id: number,
      config: Partial<MountConfigWithoutId>
    ) => {
      const { data: configs, version } = options

      const index = configs.findIndex((item) => item.id === id)
      if (index === -1) throw new Error('Config not found')
      // replace the stored config with the new one
      const newData = [...configs]

      const newConfig = {
        ...newData[index],
        ...config,
        id,
      }

      newData[index] = newConfig

      if (!(await isPermissionGranted(newConfig.patterns))) {
        return
      }

      await update.mutateAsync({ data: newData, version })
    }

    const addConfig = async (config: MountConfigWithoutId) => {
      const { data: configs, version } = options

      const lastId = configs[configs.length - 1]?.id ?? 0
      const newConfig = {
        ...config,
        id: lastId + 1,
      }

      if (!(await isPermissionGranted(config.patterns))) {
        return
      }

      await update.mutateAsync({
        data: [...configs, newConfig],
        version,
      })
    }

    const deleteConfig = async (id: number) => {
      const { data: configs, version } = options
      const index = configs.findIndex((item) => item.id === id)
      if (index === -1) throw new Error('Config not found')
      const toDelete = configs[index]
      if (toDelete.predefined)
        throw new Error('Cannot delete predefined config')
      const newData = [...configs]
      newData.splice(index, 1)

      // ignore errors when removing permission so invalid patterns won't block deletion
      await tryCatch(async () => removeOriginPermission(toDelete.patterns))
      await update.mutateAsync({ data: newData, version })
    }

    const matchByUrl = (url: string) => {
      const { data: configs } = options

      return configs.find((config) => {
        const { patterns } = config
        return patterns.some((pattern) => matchUrl(url, pattern))
      })
    }

    return {
      updateConfig,
      addConfig,
      deleteConfig,
      matchByUrl,
    }
  }, [options, update.mutateAsync])

  return {
    ...rest,
    configs: options.data,
    updateConfig,
    addConfig,
    deleteConfig,
    matchByUrl,
  }
}
