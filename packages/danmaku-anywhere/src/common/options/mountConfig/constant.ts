import defaultMountConfigJson from './default.json' with { type: 'json' }

import { getDefaultXPathPolicy } from '@/common/options/integrationPolicyStore/constant'
import type {
  MountConfig,
  MountConfigInput,
} from '@/common/options/mountConfig/schema'
import { getRandomUUID } from '@/common/utils/utils'

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
    const integration = getDefaultXPathPolicy(config.name)?.id

    const newConfig = {
      ...config,
      id: getRandomUUID(),
      integration: integration,
    }
    Object.freeze(newConfig)
    return newConfig
  }
)

Object.freeze(defaultMountConfig)
