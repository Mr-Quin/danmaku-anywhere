import { defaultDanmakuOptions } from '@/common/constants/danmakuOptions'
import { defaultExtensionOptions } from '@/common/constants/extensionOptions'
import { defaultMountConfig } from '@/common/constants/mountConfig'
import { Logger } from '@/common/services/Logger'
import { SyncOptionsService } from '@/common/services/SyncOptionsService'

export const extensionOptionsService = new SyncOptionsService(
  'extensionOptions',
  defaultExtensionOptions
).version(1, {
  upgrade: (data: any) => data,
})

const danmakuOptionsService = new SyncOptionsService(
  'danmakuOptions',
  defaultDanmakuOptions
)
  .version(1, {
    upgrade: (data: any) => data,
  })
  .version(2, {
    upgrade: (data: any) => ({
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

export const mountConfigService = new SyncOptionsService(
  'mountConfig',
  defaultMountConfig
)
  .version(1, {
    upgrade: (data: any) => data,
  })
  .version(2, {
    upgrade: (data: any) =>
      data.map((config: any) => ({
        ...config,
        enabled: false, // switching to new permission model. disable all configs by default, permission will be asked when enabled
      })),
  })

const upgradeOptions = async () => {
  await Promise.all([
    extensionOptionsService.upgrade(),
    danmakuOptionsService.upgrade(),
    mountConfigService.upgrade(),
  ])
}

export const setupOptions = async () => {
  chrome.runtime.onInstalled.addListener(async () => {
    try {
      await upgradeOptions()
    } catch (err) {
      Logger.error(err)
    }

    Logger.info('Danmaku Anywhere Installed')
  })
}
