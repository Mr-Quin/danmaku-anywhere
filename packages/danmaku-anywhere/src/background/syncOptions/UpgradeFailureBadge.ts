import { injectable } from 'inversify'
import {
  UPGRADE_RUN_KEY,
  type UpgradeRun,
} from '@/common/options/upgrade/upgradeRun'
import { ExtStorageService } from '@/common/storage/ExtStorageService'

// Marks the toolbar icon while the options upgrade is failed, since content
// scripts cannot show anything until it succeeds and the popup is where the
// user can retry.
@injectable('Singleton')
export class UpgradeFailureBadge {
  private readonly run = new ExtStorageService<UpgradeRun>(UPGRADE_RUN_KEY, {
    storageType: 'local',
  })

  setup() {
    this.run.subscribe((run) => {
      void this.show(run)
    })
    this.run.setup()
    void this.run.read().then((run) => {
      return this.show(run)
    })
  }

  private async show(run: UpgradeRun | undefined) {
    if (run?.status === 'failed') {
      await chrome.action.setBadgeBackgroundColor({ color: '#d32f2f' })
      await chrome.action.setBadgeText({ text: '!' })
      return
    }
    await chrome.action.setBadgeText({ text: '' })
  }
}
