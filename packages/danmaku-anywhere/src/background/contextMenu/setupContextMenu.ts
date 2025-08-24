import { match } from 'ts-pattern'

import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'
import { createMountConfig } from '@/common/options/mountConfig/constant'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import { mountConfigService } from '@/common/options/mountConfig/service'
import { matchUrl } from '@/common/utils/matchUrl'
import { tryCatch } from '@/common/utils/utils'

enum ContextMenuId {
  ENABLED = 'danmaku-anywhere-enabled',
  ADD_CONFIG = 'danmaku-anywhere-add-config',
  TOGGLE_CONFIG = 'danmaku-anywhere-toggle-config',
}

// add menu item to disable danmaku
export const setupContextMenu = () => {
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

    // Initialize dynamic items for the current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs[0]?.id) {
      void rebuildDynamicMenus(tabs[0].id, tabs[0].url ?? '')
    }
  })

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    match(info.menuItemId)
      .with(ContextMenuId.ENABLED, async () => {
        await extensionOptionsService.update({
          enabled: info.checked ?? false,
        })
      })
      .with(ContextMenuId.ADD_CONFIG, async () => {
        if (!tab?.url) return
        try {
          const url = new URL(tab.url)
          const pattern = url.origin + '/*'
          const input = createMountConfig(pattern)
          input.mediaQuery = 'video'
          input.name = url.hostname
          input.enabled = true
          await mountConfigService.create(input)
          // After creation, rebuild menus for this tab
          if (tab.id) void rebuildDynamicMenus(tab.id, tab.url)
        } catch (_) {
          // ignore invalid url
        }
      })
      .with(ContextMenuId.TOGGLE_CONFIG, async () => {
        if (tab?.id == null) return
        const matched = matchedConfigByTabId.get(tab.id)
        if (!matched) return
        const { id, enabled } = matched
        await mountConfigService.update(id, { enabled: !enabled })
        if (tab.url) void rebuildDynamicMenus(tab.id, tab.url)
      })
      .run()
  })

  extensionOptionsService.onChange((extensionOptions) => {
    if (!extensionOptions) return
    // try block in case the context menu is not created yet
    void tryCatch(async () =>
      chrome.contextMenus.update(ContextMenuId.ENABLED, {
        checked: extensionOptions.enabled,
      })
    )
  })

  // Rebuild dynamic menu items on tab activation or url change
  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    try {
      const tab = await chrome.tabs.get(tabId)
      void rebuildDynamicMenus(tabId, tab.url ?? '')
    } catch (_) {}
  })

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only react when URL changes or the active tab finishes loading
    if (changeInfo.url || changeInfo.status === 'complete') {
      if (tab.active) {
        void rebuildDynamicMenus(tabId, tab.url ?? '')
      }
    }
  })
}

// --- Internal state and helpers ---

const matchedConfigByTabId = new Map<number, MountConfig>()

const rebuildDynamicMenus = async (tabId: number, url: string) => {
  // Remove previous dynamic items if any
  await tryCatch(async () =>
    chrome.contextMenus.remove(ContextMenuId.ADD_CONFIG)
  )
  await tryCatch(async () =>
    chrome.contextMenus.remove(ContextMenuId.TOGGLE_CONFIG)
  )

  if (!url) return

  const configs = await mountConfigService.getAll()

  const matched = findMatchingConfig(configs, url)

  if (matched) {
    matchedConfigByTabId.set(tabId, matched)
    chrome.contextMenus.create({
      id: ContextMenuId.TOGGLE_CONFIG,
      type: 'checkbox',
      checked: matched.enabled,
      title: chrome.i18n.getMessage(
        'menuToggleMountConfig',
        matched.name || ''
      ),
      contexts: ['action', 'page', 'video'],
    })
  } else {
    matchedConfigByTabId.delete(tabId)
    chrome.contextMenus.create({
      id: ContextMenuId.ADD_CONFIG,
      title:
        chrome.i18n.getMessage('menuAddMountConfig') ||
        'Add Config for this site',
      contexts: ['action', 'page', 'video'],
    })
  }
}

const findMatchingConfig = (configs: MountConfig[], url: string) => {
  return configs.find((config) => config.patterns.some((p) => matchUrl(url, p)))
}
