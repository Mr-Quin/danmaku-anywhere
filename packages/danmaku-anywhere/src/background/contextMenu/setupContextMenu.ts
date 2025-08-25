import { match } from 'ts-pattern'

import { Logger } from '@/common/Logger'
import { createMountConfig } from '@/common/options/mountConfig/constant'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import { mountConfigService } from '@/common/options/mountConfig/service'
import { matchUrl } from '@/common/utils/matchUrl'
import { tryCatch } from '@/common/utils/utils'

enum ContextMenuId {
  ADD_CONFIG = 'danmaku-anywhere-add-config',
  TOGGLE_CONFIG = 'danmaku-anywhere-toggle-config',
}

export const setupContextMenu = () => {
  chrome.runtime.onInstalled.addListener(async () => {
    // Initialize dynamic items for the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab.id && tab.url) {
      void rebuildDynamicMenus(tab.id, tab.url)
    }
  })

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab) {
      return
    }
    const { url: tabUrl, id: tabId } = tab
    if (!tabUrl || !tabId) {
      return
    }
    match(info.menuItemId)
      .with(ContextMenuId.ADD_CONFIG, async () => {
        try {
          const url = new URL(tabUrl)
          const pattern = url.origin + '/*'
          const input = createMountConfig(pattern)
          input.mediaQuery = 'video'
          input.name = url.hostname
          input.enabled = true
          await mountConfigService.create(input)
          chrome.tabs.reload(tabId)
        } catch (e) {
          Logger.error('Create mount config failed')
          Logger.error(e)
        }
      })
      .with(ContextMenuId.TOGGLE_CONFIG, async () => {
        const matched = matchedConfigByTabId.get(tabId)
        if (!matched) {
          return
        }
        const { id, enabled } = matched
        await mountConfigService.update(id, { enabled: !enabled })
        chrome.tabs.reload(tabId)
      })
      .run()
  })

  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    void tryCatch(async () => {
      const tab = await chrome.tabs.get(tabId)
      if (tab.url) {
        await rebuildDynamicMenus(tabId, tab.url ?? '')
      }
    })
  })

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    void tryCatch(async () => {
      // Only react when URL changes or the active tab finishes loading
      if (changeInfo.url || changeInfo.status === 'complete') {
        if (tab.active && tab.url) {
          await rebuildDynamicMenus(tabId, tab.url)
        }
      }
    })
  })
}

const matchedConfigByTabId = new Map<number, MountConfig>()

const rebuildDynamicMenus = async (tabId: number, url: string) => {
  await tryCatch(async () =>
    chrome.contextMenus.remove(ContextMenuId.ADD_CONFIG)
  )
  await tryCatch(async () =>
    chrome.contextMenus.remove(ContextMenuId.TOGGLE_CONFIG)
  )

  const configs = await mountConfigService.getAll()

  const matched = findMatchingConfig(configs, url)

  if (matched) {
    matchedConfigByTabId.set(tabId, matched)
    chrome.contextMenus.create({
      id: ContextMenuId.TOGGLE_CONFIG,
      type: 'checkbox',
      checked: matched.enabled,
      title: matched.enabled
        ? chrome.i18n.getMessage('menuDisableMountConfig', matched.name)
        : chrome.i18n.getMessage('menuEnableMountConfig', matched.name),
      contexts: ['page'],
    })
  } else {
    matchedConfigByTabId.delete(tabId)
    chrome.contextMenus.create({
      id: ContextMenuId.ADD_CONFIG,
      title: chrome.i18n.getMessage('menuAddMountConfig'),
      contexts: ['page'],
    })
  }
}

const findMatchingConfig = (configs: MountConfig[], url: string) => {
  return configs.find((config) => config.patterns.some((p) => matchUrl(url, p)))
}
