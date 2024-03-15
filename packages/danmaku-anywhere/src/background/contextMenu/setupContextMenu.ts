import { match } from 'ts-pattern'

import type { ExtensionOptions } from '@/common/constants/extensionOptions'
import { defaultExtensionOptions } from '@/common/constants/extensionOptions'
import { Logger } from '@/common/services/Logger'
import { SyncOptionsService } from '@/common/services/SyncOptionsService'

enum ContextMenuId {
  ENABLED = 'danmaku-anywhere-enabled',
}

// add menu item to disable danmaku
export const setupContextMenu = async () => {
  const extensionOptionsService = new SyncOptionsService<ExtensionOptions>(
    'extensionOptions',
    defaultExtensionOptions
  )

  chrome.runtime.onInstalled.addListener(async () => {
    const extensionOptions = await extensionOptionsService.get()

    Logger.debug('Registering context menu: enabled')

    chrome.contextMenus.create({
      id: ContextMenuId.ENABLED,
      type: 'checkbox',
      checked: extensionOptions?.enabled ?? false,
      title: 'Enabled',
      contexts: ['action', 'page', 'video'],
    })
  })

  chrome.contextMenus.onClicked.addListener(async (info) => {
    match(info.menuItemId)
      .with(ContextMenuId.ENABLED, async () => {
        const extensionOptions = await extensionOptionsService.get()

        await extensionOptionsService.update({
          enabled: !extensionOptions?.enabled,
        })
      })
      .run()
  })

  extensionOptionsService.onChange((extensionOptions) => {
    if (extensionOptions) {
      chrome.contextMenus.update(ContextMenuId.ENABLED, {
        checked: extensionOptions.enabled,
      })
    }
  })
}
