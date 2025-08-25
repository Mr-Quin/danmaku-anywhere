import { match } from 'ts-pattern'
import { ContextMenuId } from '@/background/contextMenu/contextMenuId'
import {
  matchedConfigByTabId,
  rebuildDynamicMenus,
} from '@/background/contextMenu/rebuildDynamicMenus'
import { Logger } from '@/common/Logger'
import { createMountConfig } from '@/common/options/mountConfig/constant'
import { mountConfigService } from '@/common/options/mountConfig/service'
import { tryCatch } from '@/common/utils/utils'

export const setupContextMenu = () => {
  chrome.runtime.onInstalled.addListener(async () => {
    // Initialize dynamic items for the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab.id && tab.url) {
      await rebuildDynamicMenus(tab.id, tab.url)
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
        await rebuildDynamicMenus(tabId, tab.url)
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
