import { backgroundLogger } from '@/common/logger'

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'sampleContextMenu',
    title: 'Sample Context Menu',
    contexts: ['selection'],
  })
})

chrome.storage.onChanged.addListener((changes, namespace) => {
  backgroundLogger.log('storage changed', changes, namespace)
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    chrome.storage.local.set({ activeUrl: tab.url })
  }
})
