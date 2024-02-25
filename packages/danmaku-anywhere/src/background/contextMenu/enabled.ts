import {
  ExtensionOptions,
  defaultExtensionOptions,
} from '@/common/constants/extensionOptions'
import { Logger } from '@/common/services/Logger'
import { SyncOptionsService } from '@/common/services/SyncOptionsService'

const enabledMenuId = 'danmaku-anywhere-enabled'

// add menu item to disable danmaku
export const addEnabledMenu = async () => {
  const extensionOptionsService = new SyncOptionsService<ExtensionOptions>(
    'extensionOptions',
    defaultExtensionOptions
  )

  chrome.runtime.onInstalled.addListener(async () => {
    const extensionOptions = await extensionOptionsService.get()

    Logger.debug('Registering context menu: enabled')

    chrome.contextMenus.create({
      id: enabledMenuId,
      type: 'checkbox',
      checked: extensionOptions?.enabled ?? false,
      title: 'Enabled',
      contexts: ['action', 'page', 'video'],
    })

    chrome.contextMenus.onClicked.addListener(async (info) => {
      if (info.menuItemId === enabledMenuId) {
        const extensionOptions = await extensionOptionsService.get()

        await extensionOptionsService.update({
          enabled: !extensionOptions?.enabled,
        })
      }
    })
  })

  extensionOptionsService.onChange((extensionOptions) => {
    if (extensionOptions) {
      chrome.contextMenus.update(enabledMenuId, {
        checked: extensionOptions.enabled,
      })
    }
  })
}
