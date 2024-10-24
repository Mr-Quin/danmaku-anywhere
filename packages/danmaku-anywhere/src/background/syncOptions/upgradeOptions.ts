import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { produce } from 'immer'

import { Language } from '@/common/localization/language'
import { extensionOptionsService } from '@/common/options/danmakuOptions/service'
import { defaultKeymap } from '@/common/options/extensionOptions/hotkeys'
import type { ExtensionOptions } from '@/common/options/extensionOptions/schema'
import { danmakuOptionsService } from '@/common/options/extensionOptions/service'
import { xPathPolicyStore } from '@/common/options/integrationPolicyStore/service'
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
  .version(6, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add bilibili danmaku source and disable it by default
        draft.danmakuSources.dandanplay.enabled = true
        draft.danmakuSources.bilibili = {
          enabled: false,
        } as any
      }),
  })
  .version(7, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add bilibili danmaku source options
        draft.danmakuSources.bilibili.danmakuTypePreference = 'xml'
        draft.danmakuSources.bilibili.protobufLimitPerMin = 200
      }),
  })
  .version(8, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add tencent and iqiyi danmaku source options
        draft.danmakuSources.tencent = {
          enabled: false,
          limitPerMin: 200,
        }
        draft.danmakuSources.iqiyi = {
          enabled: false,
          limitPerMin: 200,
        }
      }),
  })
  .version(9, {
    upgrade: (data: PrevOptions) =>
      produce<ExtensionOptions>(data, (draft) => {
        // Add hotkeys
        draft.hotkeys = defaultKeymap
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
  .version(3, {
    upgrade: (data: PrevOptions) => {
      return produce<any>(data, (draft) => {
        // remove fields: show, filterLevel
        // add limitPerSec
        delete draft.show
        delete draft.filterLevel
        draft.limitPerSec = 10
      })
    },
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

export const upgradeOptions = async () => {
  await Promise.all([
    extensionOptionsService.upgrade(),
    danmakuOptionsService.upgrade(),
    mountConfigService.upgrade(),
    xPathPolicyStore.upgrade(),
  ])
}
