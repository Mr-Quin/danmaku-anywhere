import { produce } from 'immer'
import { useMemo } from 'react'

import {
  type MountConfig,
  type MountConfigOptions,
} from '@/common/options/mountConfig/mountConfig'
import { useSuspenseExtStorageQuery } from '@/common/queries/extStorage/useSuspenseExtStorageQuery'
import { matchUrl } from '@/common/utils/matchUrl'
import {
  createDownload,
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
    const nameExists = (name: string) => {
      const { data: configs } = options

      return configs.some((config) => config.name === name)
    }

    const updateConfig = async (name: string, config: Partial<MountConfig>) => {
      const { data: configs, version } = options

      const prevConfig = configs.find((item) => item.name === name)

      if (!prevConfig) throw new Error(`Config not found: "${name}"`)

      const newConfig = produce(prevConfig, (draft) => {
        Object.assign(draft, config)
      })

      // replace the stored config with the new one
      const newData = produce(configs, (draft) => {
        const index = draft.findIndex((item) => item.name === name)
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

      if (nameExists(config.name))
        throw new Error(`Name already exists: "${config.name}"`)

      if (!(await isPermissionGranted(config.patterns))) {
        return
      }

      await update.mutateAsync({
        data: [...configs, config],
        version,
      })
    }

    const deleteConfig = async (name: string) => {
      const { data: configs, version } = options

      const index = configs.findIndex((item) => item.name === name)

      if (index === -1) throw new Error(`Config not found: "${name}"`)

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
     * Import the configs, replacing the current configs if name matches,
     * otherwise add the config
     */
    const importConfigs = async (configs: MountConfig[]) => {
      const { data: currentConfigs, version } = options

      const newData = produce(currentConfigs, (draft) => {
        for (const config of configs) {
          const index = draft.findIndex((item) => item.name === config.name)

          if (index !== -1) {
            // if the config already exists, replace it
            draft[index] = config
          } else {
            // otherwise add it
            draft.push(config)
          }
        }
      })

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

    return {
      updateConfig,
      addConfig,
      deleteConfig,
      matchByUrl,
      exportConfigs,
      importConfigs,
      nameExists,
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
