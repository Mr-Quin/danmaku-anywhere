import { inject, injectable } from 'inversify'
import { match } from 'ts-pattern'
import { ContextMenuId } from '@/background/contextMenu/contextMenuId'
import {
  matchedConfigByTabId,
  rebuildDynamicMenus,
} from '@/background/contextMenu/rebuildDynamicMenus'
import { Logger } from '@/common/Logger'
import { MountConfigService } from '@/common/options/mountConfig/service'
import { tryCatch } from '@/common/utils/utils'

@injectable('Singleton')
export class ContextMenuManager {
  constructor(
    @inject(MountConfigService)
    private mountConfigService: MountConfigService
  ) {}

  setup() {
    chrome.runtime.onInstalled.addListener(async () => {
      // Initialize dynamic items for the current active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })
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
            await this.mountConfigService.createByUrl(tabUrl)
            void chrome.tabs.reload(tabId)
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
          await this.mountConfigService.update(id, { enabled: !enabled })
          void chrome.tabs.reload(tabId)
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
}
