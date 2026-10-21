import { injectable } from 'inversify'
import {
  failedOnThisBuild,
  staleAt,
  UPGRADE_RUN_KEY,
  type UpgradeRun,
} from '@/common/options/upgrade/upgradeRun'
import { ExtStorageService } from '@/common/storage/ExtStorageService'

const BADGE_TEXT = '!'

// Marks the toolbar icon while the options upgrade is failed, since content
// scripts cannot show anything until it succeeds and the popup is where the
// user can retry.
@injectable('Singleton')
export class UpgradeFailureBadge {
  private readonly run = new ExtStorageService<UpgradeRun>(UPGRADE_RUN_KEY, {
    storageType: 'local',
  })
  private showing = false
  private staleTimer?: ReturnType<typeof setTimeout>

  setup() {
    let changes = 0
    this.run.subscribe((run) => {
      changes += 1
      void this.show(run)
    })
    this.run.setup()
    // A change that lands while the first read is in flight is newer than
    // what the read returns.
    void this.run.read().then((run) => {
      if (changes === 0) {
        return this.show(run)
      }
    })
  }

  // Badge text set for a tab hides the global one, so whoever writes per-tab
  // badge text has to leave it alone while this is showing.
  isShowing(): boolean {
    return this.showing
  }

  private async show(run: UpgradeRun | undefined) {
    // A run cut off mid-way leaves no change event behind.
    clearTimeout(this.staleTimer)
    const deadline = staleAt(run)
    if (deadline !== undefined && deadline > Date.now()) {
      this.staleTimer = setTimeout(() => {
        void this.show(run)
      }, deadline - Date.now())
    }
    const failed = failedOnThisBuild(run, Date.now()) !== undefined
    const wasShowing = this.showing
    this.showing = failed
    if (failed) {
      await chrome.action.setBadgeBackgroundColor({ color: '#d32f2f' })
      await this.setText(BADGE_TEXT)
    } else if (wasShowing) {
      await this.setText('')
    } else {
      await chrome.action.setBadgeText({ text: '' })
    }
  }

  private async setText(text: string) {
    await chrome.action.setBadgeText({ text })
    const tabs = await chrome.tabs.query({})
    await Promise.all(
      tabs.map((tab) => {
        if (tab.id === undefined) {
          return undefined
        }
        return chrome.action.setBadgeText({ text, tabId: tab.id })
      })
    )
  }
}
