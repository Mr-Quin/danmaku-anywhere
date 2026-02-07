import { isStandaloneRuntime } from '@/common/environment/isStandalone'
import { isChromeRuntimeAvailable } from '@/common/extension/chromeRuntime'
import { getStandaloneStorageArea } from '@/common/storage/standaloneStorage'

export type ExtStorageType = 'local' | 'sync' | 'session'

export const getStorageArea = (storageType: ExtStorageType) => {
  if (
    !isStandaloneRuntime() &&
    isChromeRuntimeAvailable() &&
    chrome.storage?.[storageType]
  ) {
    return chrome.storage[storageType]
  }

  return getStandaloneStorageArea(storageType)
}
