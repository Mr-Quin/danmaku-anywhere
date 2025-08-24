import type {
  MountConfig,
  MountConfigInput,
} from '@/common/options/mountConfig/schema'
import defaultMountConfigJson from './default.json' with { type: 'json' }

export const createMountConfig = (url: string): MountConfigInput => {
  return {
    patterns: [url],
    mediaQuery: '',
    enabled: true,
    permissive: false,
    name: '',
    integration: undefined,
  }
}

export const defaultMountConfig: MountConfig[] = defaultMountConfigJson.map(
  (config) => {
    // Ensure permissive flag exists in defaults
    const c = config as Partial<MountConfig>
    return { ...(c as MountConfig), permissive: c.permissive ?? false }
  }
)

Object.freeze(defaultMountConfig)
