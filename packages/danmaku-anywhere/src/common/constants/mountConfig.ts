import type { Options } from '../services/SyncOptionsService'

import defaultMountConfigJson from './mountConfig/default.json' assert { type: 'json' }
export interface MountConfig {
  readonly patterns: string[]
  readonly mediaQuery: string
  /**
   * @deprecated containerQuery is deprecated because
   * it's tricky to find the right container to serve as the danamku mount point,
   * so we use a global container and overlay it on top of the video.
   */
  readonly containerQuery?: string
  readonly predefined: boolean
  /**
   * Whether the config is enabled
   * Affects content script registration.
   * Content script is only registered for sites with enabled configs.
   * Page needs to be reloaded for changes to take effect.
   */
  readonly enabled: boolean
  readonly name: string
  readonly id: number
}

export type MountConfigOptions = Options<MountConfig[]>

export interface MountConfigWithoutId extends Omit<MountConfig, 'id'> {
  readonly id?: number
}

export const createMountConfig = (url: string): MountConfigWithoutId => {
  return {
    patterns: [url],
    mediaQuery: '',
    containerQuery: '',
    predefined: false,
    enabled: true,
    name: '',
  }
}

export const defaultMountConfig: MountConfig[] = defaultMountConfigJson.map(
  (config, index) => {
    return {
      ...config,
      id: index,
      predefined: true,
    }
  }
)
