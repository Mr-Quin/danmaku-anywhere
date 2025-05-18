import defaultMountConfigJson from './default.json' with { type: 'json' }

import type {
  MountConfig,
  MountConfigInput,
} from '@/common/options/mountConfig/schema'

export const createMountConfig = (url: string): MountConfigInput => {
  return {
    patterns: [url],
    mediaQuery: '',
    enabled: true,
    name: '',
    integration: undefined,
  }
}

export const defaultMountConfig: MountConfig[] = defaultMountConfigJson.map(
  (config) => {
    return config as MountConfig
  }
)

Object.freeze(defaultMountConfig)
