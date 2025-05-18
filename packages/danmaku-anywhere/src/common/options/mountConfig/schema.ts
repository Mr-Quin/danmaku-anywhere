import { z } from 'zod'

import type { Options } from '@/common/options/OptionsService/types'
import { getRandomUUID, validateOrigin } from '@/common/utils/utils'

export const mountConfigInputSchema = z.object({
  id: z.string().uuid().optional().default(getRandomUUID()),
  author: z.string().optional(),
  description: z.string().optional(),
  patterns: z.array(
    z.string().refine(
      async (value) => {
        // If the pattern is invalid, it returns an error string, so we need to negate it
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
  /**
   * The integration to associate with the config
   */
  integration: z.string().optional(),
})

export const mountConfigInputListSchema = z.array(mountConfigInputSchema)

export type MountConfigInput = z.input<typeof mountConfigInputSchema>

export type MountConfig = z.output<typeof mountConfigInputSchema>

export type MountConfigOptions = Options<MountConfig[]>
