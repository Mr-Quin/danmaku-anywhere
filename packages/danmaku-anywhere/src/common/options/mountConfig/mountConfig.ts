import { z } from 'zod'

import type { Options } from '../../services/SyncOptionsService'
import { validateOrigin } from '../../utils/utils'

import defaultMountConfigJson from './default.json' assert { type: 'json' }

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
   * it's tricky to find the right container to serve as the danamku mount point,
   * so we use a global container and overlay it on top of the video.
   */
  readonly containerQuery?: string
  /**
   * @deprecated
   * Whether the config is predefined
   * Predefined configs cannot be deleted
   *
   * We don't use this field anymore because there is no point in preventing users from deleting configs
   */
  readonly predefined?: boolean
}

const mountConfigSchema = z.object({
  patterns: z.array(
    z.string().refine(
      async (value) => {
        // If the pattern is a invalid, it returns a error string, so we need to negate it
        if (await validateOrigin(value)) {
          return false
        }
        return true
      },
      {
        message: 'Invalid pattern',
      }
    )
  ),
  mediaQuery: z.string(),
  /**
   * Whether the config is enabled
   * Affects content script registration.
   * Content script is only registered for sites with enabled configs.
   * Page needs to be reloaded for changes to take effect.
   */
  enabled: z.boolean(),
  /**
   * The name of the config
   * Should be unique
   */
  name: z.string(),
})

export const mountConfigListSchema = z.array(mountConfigSchema)

export type MountConfig = z.infer<typeof mountConfigSchema>

export type MountConfigOptions = Options<MountConfig[]>

export const createMountConfig = (url: string): MountConfig => {
  return {
    patterns: [url],
    mediaQuery: '',
    enabled: true,
    name: '',
  }
}

export const defaultMountConfig: MountConfig[] = defaultMountConfigJson.map(
  (config) => {
    const newConfig = {
      ...config,
    }
    Object.freeze(newConfig)
    return newConfig
  }
)

Object.freeze(defaultMountConfig)
