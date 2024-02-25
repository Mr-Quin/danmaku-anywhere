import { defaultDanmakuOptions } from '@/common/constants/danmakuOptions'
import { defaultExtensionOptions } from '@/common/constants/extensionOptions'
import { defaultMountConfig } from '@/common/constants/mountConfig'
import { Logger } from '@/common/services/Logger'
import { SyncOptionsService } from '@/common/services/SyncOptionsService'

const upgradeOptions = async () => {
  await new SyncOptionsService('extensionOptions', defaultExtensionOptions)
    .version(1, {
      upgrade: (data: any) => data,
    })
    .upgrade()

  await new SyncOptionsService('danmakuOptions', defaultDanmakuOptions)
    .version(1, {
      upgrade: (data: any) => data,
    })
    .upgrade()

  await new SyncOptionsService('mountConfig', defaultMountConfig)
    .version(1, {
      upgrade: (data: any) => data,
    })
    .upgrade()
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
