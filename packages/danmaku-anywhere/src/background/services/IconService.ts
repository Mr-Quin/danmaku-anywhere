import { inject, injectable } from 'inversify'
import { UpgradeFailureBadge } from '@/background/syncOptions/UpgradeFailureBadge'
import { invariant, isServiceWorker } from '@/common/utils/utils'

@injectable('Singleton')
export class IconService {
  constructor(
    @inject(UpgradeFailureBadge)
    private readonly upgradeFailureBadge: UpgradeFailureBadge
  ) {
    invariant(
      isServiceWorker(),
      'IconService is only available in service worker'
    )
  }

  async setActive(tabId: number, commentCount: number) {
    const badgeText = commentCount > 999 ? '999+' : commentCount.toString()
    await this.setBadgeText(badgeText, tabId)
  }

  async setUnavailable(tabId: number) {
    await this.setBadgeText('', tabId)
    await chrome.action.setIcon({ path: 'grey_32.png', tabId })
  }

  async setNormal(tabId: number) {
    await this.setBadgeText('', tabId)
    await chrome.action.setIcon({ path: 'normal_32.png', tabId })
  }

  private async setBadgeText(text: string, tabId: number) {
    if (this.upgradeFailureBadge.isShowing()) {
      return
    }
    await chrome.action.setBadgeText({ text, tabId })
  }
}
