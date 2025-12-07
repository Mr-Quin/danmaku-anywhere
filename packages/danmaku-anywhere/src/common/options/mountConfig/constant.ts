import type {
  MountConfig,
  MountConfigInput,
} from '@/common/options/mountConfig/schema'

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
    ...config,
  }
}

export const defaultMountConfig: MountConfig[] = []

Object.freeze(defaultMountConfig)
