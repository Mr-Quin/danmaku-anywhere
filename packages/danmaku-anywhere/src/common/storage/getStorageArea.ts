import { isChromeRuntimeAvailable } from '@/common/environment/chromeRuntime'
import { IS_STANDALONE_RUNTIME } from '@/common/environment/isStandalone'
import { getStandaloneStorageArea } from '@/common/storage/standaloneStorage'

export type ExtStorageType = 'local' | 'sync' | 'session'

export const getStorageArea = (storageType: ExtStorageType) => {
  if (
    !IS_STANDALONE_RUNTIME &&
    isChromeRuntimeAvailable() &&
    chrome.storage?.[storageType]
  ) {
    return chrome.storage[storageType]
  }

  return getStandaloneStorageArea(storageType)
}
