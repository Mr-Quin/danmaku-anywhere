export const addEnabledMenu = () => {
  // add menu item to disable danmaku
  chrome.storage.sync.get('extensionOptions', ({ extensionOptions }) => {
    chrome.contextMenus.create({
      id: 'danmaku-anywhere-enabled',
      type: 'checkbox',
      checked: extensionOptions?.enabled ?? false,
      title: 'Enabled',
      contexts: ['action', 'page'],
    })
  })

  chrome.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId === 'danmaku-anywhere-enabled') {
      const { extensionOptions } = await chrome.storage.sync.get(
        'extensionOptions'
      )

      await chrome.storage.sync.set({
        extensionOptions: {
          ...extensionOptions,
          enabled: !extensionOptions?.enabled,
        },
      })
    }
  })

  chrome.storage.sync.onChanged.addListener((changes) => {
    if (changes.extensionOptions) {
      const { newValue } = changes.extensionOptions
      if (newValue) {
        chrome.contextMenus.update('danmaku-anywhere-enabled', {
          checked: newValue.enabled,
        })
      }
    }
  })
}
