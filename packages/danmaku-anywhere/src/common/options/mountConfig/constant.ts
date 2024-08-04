import defaultMountConfigJson from './default.json' assert { type: 'json' }

import { IntegrationType } from '@/common/danmaku/enums'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import { getRandomUUID } from '@/common/utils/utils'

/**
 * @deprecated
 * interface kept for documentation purposes,
 * new configs should use the MountConfig type created by zod
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface LegacyMountConfig {
  readonly patterns: string[]
  readonly mediaQuery: string
  readonly enabled: boolean
  readonly name: string
  /**
   * @deprecated
   * The unique identifier of the config
   *
   * Now we use the name field as the unique identifier
   */
  readonly id?: number
  /**
   * @deprecated
   * containerQuery is deprecated because
   * it's tricky to find the right container to serve as the danmaku mount point,
   * so we use a global container and overlay it on top of the video.
   */
  readonly containerQuery?: string
  /**
   * @deprecated
   * Whether the config is predefined.
   * Predefined configs cannot be deleted
   *
   * We don't use this field anymore because there is no point in preventing users from deleting configs
   */
  readonly predefined?: boolean
}

export const createMountConfig = (url: string): MountConfig => {
  return {
    patterns: [url],
    mediaQuery: '',
    enabled: true,
    name: '',
    integration: IntegrationType.None,
    id: getRandomUUID(),
  }
}

export const defaultMountConfig: MountConfig[] = defaultMountConfigJson.map(
  (config) => {
    const integration =
      IntegrationType[config.integration as keyof typeof IntegrationType]

    const newConfig = {
      ...config,
      id: getRandomUUID(),
      integration: integration ?? IntegrationType.None,
    }
    Object.freeze(newConfig)
    return newConfig
  }
)

Object.freeze(defaultMountConfig)
