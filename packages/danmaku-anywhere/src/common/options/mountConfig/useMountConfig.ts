import { produce } from 'immer'
import { useMemo } from 'react'

import type {
  MountConfig,
  MountConfigOptions,
} from '@/common/options/mountConfig/schema'
import { mountConfigListSchema } from '@/common/options/mountConfig/schema'
import { useSuspenseExtStorageQuery } from '@/common/storage/hooks/useSuspenseExtStorageQuery'
import { matchUrl } from '@/common/utils/matchUrl'
import {
  createDownload,
  getRandomUUID,
  hasOriginPermission,
  requestOriginPermission,
} from '@/common/utils/utils'

const isPermissionGranted = async (patterns: string[]) => {
  if (!(await hasOriginPermission(patterns))) {
    // Request permission if not granted.
    // If the user denies permission, do not save
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

  const methods = useMemo(() => {
    const updateConfig = async (id: string, config: Partial<MountConfig>) => {
      const { data: configs, version } = options

      const prevConfig = configs.find((item) => item.id === id)

      if (!prevConfig) throw new Error(`Config not found: "${id}"`)

      const newConfig = produce(prevConfig, (draft) => {
        Object.assign(draft, config)
      })

      // replace the stored config with the new one
      const newData = produce(configs, (draft) => {
        const index = draft.findIndex((item) => item.id === id)
        draft[index] = {
          ...draft[index],
          ...config,
        }
      })

      if (!(await isPermissionGranted(newConfig.patterns))) {
        return
      }

      await update.mutateAsync({ data: newData, version })
    }

    const addConfig = async (config: MountConfig) => {
      const { data: configs, version } = options

      if (!(await isPermissionGranted(config.patterns))) {
        return
      }

      await update.mutateAsync({
        data: [...configs, config],
        version,
      })
    }

    const deleteConfig = async (id: string) => {
      const { data: configs, version } = options

      const index = configs.findIndex((item) => item.id === id)

      if (index === -1) throw new Error(`Config not found: "${id}"`)

      const newData = produce(configs, (draft) => {
        draft.splice(index, 1)
      })

      await update.mutateAsync({ data: newData, version })
    }

    const matchByUrl = (url: string) => {
      const { data: configs } = options

      return configs.find((config) => {
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

    /**
     * Import the configs
     * Disable all imported configs and regenerate the id
     */
    const importConfigs = async (configs: MountConfig[]) => {
      const { data: currentConfigs, version } = options

      const parsed = await mountConfigListSchema.parseAsync(configs)

      const newData = [
        ...currentConfigs,
        ...parsed.map((config) => ({
          ...config,
          enabled: false,
          id: getRandomUUID(),
        })),
      ]

      // check permission for all imported configs
      // it should only ask for permission for the ones that are not already granted
      if (
        !(await isPermissionGranted(
          newData.flatMap((config) => config.patterns)
        ))
      ) {
        return
      }

      await update.mutateAsync({ data: newData, version })
    }

    // Find configs using the integration id, and unset the integration id
    const unsetIntegration = async (id: string) => {
      const { data: configs, version } = options

      const newData = produce(configs, (draft) => {
        draft.forEach((config) => {
          if (config.integration === id) {
            delete config.integration
          }
        })
      })

      await update.mutateAsync({ data: newData, version })
    }

    return {
      updateConfig,
      addConfig,
      deleteConfig,
      matchByUrl,
      exportConfigs,
      importConfigs,
      unsetIntegration,
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
