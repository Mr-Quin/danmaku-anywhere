import { ExtensionOptions } from '@/common/constants/extensionOptions'
import { ExtStorageService } from '@/common/services/ExtStorageService'

export const addEnabledMenu = () => {
  // add menu item to disable danmaku
  const extensionOptionsService = new ExtStorageService<ExtensionOptions>(
    'extensionOptions',
    {
      storageType: 'sync',
    }
  )

  extensionOptionsService.read().then((extensionOptions) => {
    chrome.contextMenus.create({
      id: 'danmaku-anywhere-enabled',
      type: 'checkbox',
      checked: extensionOptions?.enabled ?? false,
      title: 'Enabled',
      contexts: ['action', 'page', 'video'],
    })
  })

  chrome.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId === 'danmaku-anywhere-enabled') {
      const extensionOptions = await extensionOptionsService.read()

      await extensionOptionsService.set({
        ...extensionOptions,
        enabled: !extensionOptions?.enabled,
      })
    }
  })

  extensionOptionsService.subscribe((extensionOptions) => {
    if (extensionOptions) {
      chrome.contextMenus.update('danmaku-anywhere-enabled', {
        checked: extensionOptions.enabled,
      })
    }
  })
}
