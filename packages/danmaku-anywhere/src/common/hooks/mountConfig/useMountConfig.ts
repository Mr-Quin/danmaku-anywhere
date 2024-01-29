import { useMemo } from 'react'

import {
  MountConfigOptions,
  MountConfigWithoutId,
} from '@/common/constants/mountConfig'
import { useExtStorage } from '@/common/hooks/useExtStorage'
import { matchUrl } from '@/common/utils'

export const useMountConfig = () => {
  const { data, update, isLoading } = useExtStorage<MountConfigOptions>(
    'mountConfig',
    {
      storageType: 'sync',
    }
  )

  const configs = data?.configs

  const { updateConfig, addConfig, deleteConfig, matchByUrl } = useMemo(() => {
    const updateConfig = async (
      id: number,
      config: Partial<MountConfigWithoutId>
    ) => {
      if (!configs) return
      const index = configs.findIndex((item) => item.id === id)
      if (index === -1) throw new Error('Config not found')
      // replace the stored config with the new one
      const newData = [...configs]
      newData[index] = {
        ...newData[index],
        ...config,
        id,
      }
      await update.mutateAsync({ configs: newData })
    }

    const addConfig = async (config: MountConfigWithoutId) => {
      if (!configs) return
      // if (data.some((item) => item.name === config.name))
      //   throw new Error('Name already exists')
      const lastId = configs[configs.length - 1]?.id ?? 0
      const newConfig = {
        ...config,
        id: lastId + 1,
      }
      await update.mutateAsync({
        configs: [...configs, newConfig],
      })
    }

    const deleteConfig = async (id: number) => {
      if (!configs) return
      const index = configs.findIndex((item) => item.id === id)
      if (index === -1) throw new Error('Config not found')
      const toDelete = configs[index]
      if (toDelete.predefined)
        throw new Error('Cannot delete predefined config')
      const newData = [...configs]
      newData.splice(index, 1)
      await update.mutateAsync({ configs: newData })
    }

    const matchByUrl = (url: string) => {
      if (!configs) return
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
  }, [configs, update])

  return {
    isLoading,
    configs: configs,
    updateConfig,
    addConfig,
    deleteConfig,
    matchByUrl,
  }
}
