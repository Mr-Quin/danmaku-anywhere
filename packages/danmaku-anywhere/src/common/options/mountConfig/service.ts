import { produce } from 'immer'

import { defaultMountConfig } from '@/common/options/mountConfig/constant'
import type { PrevOptions } from '@/common/options/OptionsService/OptionsService'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { getRandomUUID } from '@/common/utils/utils'

export const mountConfigService = new OptionsService(
  'mountConfig',
  defaultMountConfig
)
  .version(1, {
    upgrade: (data: PrevOptions) => data,
  })
  .version(2, {
    upgrade: (data: PrevOptions) =>
      data.map((config: PrevOptions) => ({
        ...config,
        enabled: false, // switching to new permission model. disable all configs by default, permission will be asked when enabled
      })),
  })
  .version(3, {
    upgrade: (data: PrevOptions) =>
      data.map((config: PrevOptions) =>
        produce(config, (draft: PrevOptions) => {
          // add id field
          draft.id = getRandomUUID()
          // add integration field
          if (draft.name === 'plex') {
            draft.integration = 1
          } else {
            draft.integration = 0
          }
        })
      ),
  })
  .version(4, {
    upgrade: (data: PrevOptions) =>
      data.map((config: PrevOptions) =>
        produce(config, (draft: PrevOptions) => {
          // Remove existing integration to migrate to new policy based integration
          // User has to manually select the integration policy
          delete draft.integration
        })
      ),
  })
