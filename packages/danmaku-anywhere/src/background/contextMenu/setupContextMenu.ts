import { match } from 'ts-pattern'

import { extensionOptionsService } from '../syncOptions/upgradeOptions'

import { Logger } from '@/common/services/Logger'
import { tryCatch } from '@/common/utils'

enum ContextMenuId {
  ENABLED = 'danmaku-anywhere-enabled',
}

// add menu item to disable danmaku
export const setupContextMenu = async () => {
  chrome.runtime.onInstalled.addListener(async () => {
    const extensionOptions = await extensionOptionsService.get()

    Logger.debug('Registering context menu: enabled')

    chrome.contextMenus.create({
      id: ContextMenuId.ENABLED,
      type: 'checkbox',
      checked: extensionOptions.enabled,
      title: 'Enabled',
      contexts: ['action', 'page', 'video'],
    })
  })

  chrome.contextMenus.onClicked.addListener(async (info) => {
    match(info.menuItemId)
      .with(ContextMenuId.ENABLED, async () => {
        await extensionOptionsService.update({
          enabled: info.checked ?? false,
        })
      })
      .run()
  })

  extensionOptionsService.onChange((extensionOptions) => {
    if (!extensionOptions) return
    // try block in case the context menu is not created yet
    tryCatch(async () =>
      chrome.contextMenus.update(ContextMenuId.ENABLED, {
        checked: extensionOptions.enabled,
      })
    )
  })
}
