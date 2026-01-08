import type {
  MountConfig,
  MountConfigInput,
} from '@/common/options/mountConfig/schema'
import { BUILT_IN_AI_PROVIDER_ID } from '../aiProviderConfig/constant'

export const createMountConfig = (
  config: Partial<MountConfigInput> = {}
): MountConfigInput => {
  return {
    patterns: [],
    mediaQuery: 'video',
    enabled: true,
    name: '',
    mode: 'manual',
    integration: undefined,
    ai: {
      providerId: BUILT_IN_AI_PROVIDER_ID,
    },
    ...config,
  }
}

export const defaultMountConfig: MountConfig[] = []

Object.freeze(defaultMountConfig)
