import { IS_CHROME_RUNTIME_AVAILABLE } from '@/common/environment/chromeRuntime'
import { IS_STANDALONE_RUNTIME } from '@/common/environment/isStandalone'
import { getStandaloneStorageArea } from '@/common/standalone/standaloneStorage'

export type ExtStorageType = 'local' | 'sync' | 'session'

export const getStorageArea = (storageType: ExtStorageType) => {
  if (
    !IS_STANDALONE_RUNTIME &&
    IS_CHROME_RUNTIME_AVAILABLE &&
    chrome.storage?.[storageType]
  ) {
    return chrome.storage[storageType]
  }

  return getStandaloneStorageArea(storageType)
}
