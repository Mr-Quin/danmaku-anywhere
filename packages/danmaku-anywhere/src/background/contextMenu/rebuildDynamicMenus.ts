import { ContextMenuId } from '@/background/contextMenu/contextMenuId'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import { mountConfigService } from '@/common/options/mountConfig/service'
import { matchUrl } from '@/common/utils/matchUrl'
import { createTaskQueue } from '@/common/utils/taskQueue'
import { tryCatch } from '@/common/utils/utils'

export const matchedConfigByTabId = new Map<number, MountConfig>()

const q = createTaskQueue()

const baseRebuildDynamicMenus = async (tabId: number, url: string) => {
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

export const rebuildDynamicMenus = (tabId: number, url: string) =>
  q.run(() => baseRebuildDynamicMenus(tabId, url))

const findMatchingConfig = (configs: MountConfig[], url: string) => {
  return configs.find((config) => config.patterns.some((p) => matchUrl(url, p)))
}
