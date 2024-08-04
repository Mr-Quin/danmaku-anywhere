import { DanDanChConvert } from '@danmaku-anywhere/dandanplay-api'
import { produce } from 'immer'

import { IntegrationType } from '@/common/danmaku/enums'
import { Language } from '@/common/localization/language'
import { extensionOptionsService } from '@/common/options/danmakuOptions/service'
import type { ExtensionOptions } from '@/common/options/extensionOptions/schema'
import { danmakuOptionsService } from '@/common/options/extensionOptions/service'
import { mountConfigService } from '@/common/options/mountConfig/service'
import { ColorMode } from '@/common/theme/enums'
import { getRandomUUID } from '@/common/utils/utils'

type PrevOptions = any

extensionOptionsService
  .version(1, {
    upgrade: (data: PrevOptions) => data,
  })
  .version(2, {
    upgrade: (data: PrevOptions) => {
      return {
        ...data,
        lang: Language.zh, // add lang field
      }
    },
  })
  .version(3, {
    upgrade: (data: PrevOptions) => {
      return {
        ...data,
        danmakuSources: {
          dandanplay: {
            baseUrl: 'https://api.dandanplay.net', // add danmakuSource with baseUrl field
          },
        },
      }
    },
  })
  .version(4, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add option to convert between simplified and traditional Chinese
        draft.danmakuSources.dandanplay.chConvert = DanDanChConvert.None
      }),
  })
  .version(5, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add theme options
        draft.theme = {
          colorMode: ColorMode.System,
        }
      }),
  })

danmakuOptionsService
  .version(1, {
    upgrade: (data: PrevOptions) => data,
  })
  .version(2, {
    upgrade: (data: PrevOptions) => ({
      ...data,
      // add safeZones and offset
      safeZones: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
      offset: 0,
    }),
  })

mountConfigService
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
        produce(config, (draft: any) => {
          // add id field
          draft.id = getRandomUUID()
          // add integration field
          if (draft.name === 'plex') {
            draft.integration = IntegrationType.Plex
          } else {
            draft.integration = IntegrationType.None
          }
        })
      ),
  })

export const upgradeOptions = async () => {
  await Promise.all([
    extensionOptionsService.upgrade(),
    danmakuOptionsService.upgrade(),
    mountConfigService.upgrade(),
  ])
}
