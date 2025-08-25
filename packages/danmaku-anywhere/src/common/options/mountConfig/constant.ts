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

export const defaultMountConfig: MountConfig[] = []

Object.freeze(defaultMountConfig)
