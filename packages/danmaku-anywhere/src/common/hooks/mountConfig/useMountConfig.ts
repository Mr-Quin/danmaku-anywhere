import { useEffect, useMemo, useState } from 'react'
import { MountConfig, MountConfigWithoutId } from '@/common/constants'
import { useExtStorage } from '@/common/hooks/useExtStorage'
import { getActiveTab, matchConfig, matchUrl } from '@/common/utils'

export const useActiveTabUrl = () => {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    getActiveTab().then((tab) => {
      setUrl(tab?.url)
    })
  }, [])

  return url
}

export const useMountConfig = () => {
  const { data, update } = useExtStorage<MountConfig[]>('mountConfig', {
    storageType: 'sync',
  })

  const { updateConfig, addConfig, deleteConfig, matchByUrl } = useMemo(() => {
    const updateConfig = async (
      id: number,
      config: Partial<MountConfigWithoutId>
    ) => {
      if (!data) return
      const index = data.findIndex((item) => item.id === id)
      if (index === -1) throw new Error('Config not found')
      // replace the stored config with the new one
      const newData = [...data]
      newData[index] = {
        ...newData[index],
        ...config,
        id,
      }
      await update.mutateAsync(newData)
    }

    const addConfig = async (config: MountConfigWithoutId) => {
      if (!data) return
      const lastId = data[data.length - 1]?.id ?? 0
      const newConfig = {
        ...config,
        id: lastId + 1,
      }
      await update.mutateAsync([...data, newConfig])
    }

    const deleteConfig = async (id: number) => {
      if (!data) return
      const index = data.findIndex((item) => item.id === id)
      if (index === -1) throw new Error('Config not found')
      const toDelete = data[index]
      if (toDelete.predefined)
        throw new Error('Cannot delete predefined config')
      const newData = [...data]
      newData.splice(index, 1)
      await update.mutateAsync(newData)
    }

    const matchByUrl = (url: string) => {
      if (!data) return
      return data.find((config) => {
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
  }, [data, update])

  return {
    configs: data,
    updateConfig,
    addConfig,
    deleteConfig,
    matchByUrl,
  }
}

export const useCurrentMountConfig = (
  url?: string | null,
  configs?: MountConfig[] | null
) => {
  return useMemo(() => {
    if (!url || !configs) return null
    return matchConfig(url, configs)
  }, [url, configs])
}
