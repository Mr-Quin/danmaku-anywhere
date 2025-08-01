import { invariant, isServiceWorker } from '@/common/utils/utils'

export class IconService {
  constructor() {
    invariant(
      isServiceWorker(),
      'IconService is only available in service worker'
    )
  }

  async setActive(tabId: number, commentCount: number) {
    const badgeText = commentCount > 999 ? '999+' : commentCount.toString()
    await chrome.action.setBadgeText({ text: badgeText, tabId })
  }

  async setUnavailable(tabId: number) {
    await chrome.action.setBadgeText({ text: '', tabId })
    await chrome.action.setIcon({ path: 'grey_32.png', tabId })
  }

  async setNormal(tabId: number) {
    await chrome.action.setBadgeText({ text: '', tabId })
    await chrome.action.setIcon({ path: 'normal_32.png', tabId })
  }
}
