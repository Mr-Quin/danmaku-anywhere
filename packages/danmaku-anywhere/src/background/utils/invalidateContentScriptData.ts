import { controllerRpcClient } from '@/common/rpcClient/controller/client'

export const invalidateContentScriptData = async (senderTabId?: number) => {
  const tabs = await chrome.tabs.query({})
  tabs.forEach((tab) => {
    if (senderTabId === tab.id) {
      // don't send invalidateEpisodes to the tab that initiated the request
      return
    }
    void controllerRpcClient
      .invalidateCache(
        undefined,
        { silent: true },
        {
          tabInfo: {
            windowId: tab.windowId,
            index: tab.index,
          },
        }
      )
      .catch(() => {
        // tabs without content scripts will throw an error, which we can ignore
      })
  })
}
