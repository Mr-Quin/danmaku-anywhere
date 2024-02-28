import { useMemo } from 'react'

import { useSuspenseExtStorageQuery } from '../extStorage/useSuspenseExtStorageQuery'

import type {
  MountConfigOptions,
  MountConfigWithoutId,
} from '@/common/constants/mountConfig'
import { matchUrl } from '@/common/utils'

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
      newData[index] = {
        ...newData[index],
        ...config,
        id,
      }
      await update.mutateAsync({ data: newData, version })
    }

    const addConfig = async (config: MountConfigWithoutId) => {
      const { data: configs, version } = options
      // if (data.some((item) => item.name === config.name))
      //   throw new Error('Name already exists')
      const lastId = configs[configs.length - 1]?.id ?? 0
      const newConfig = {
        ...config,
        id: lastId + 1,
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
