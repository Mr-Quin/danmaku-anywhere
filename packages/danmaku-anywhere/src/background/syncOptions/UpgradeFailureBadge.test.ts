import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { UPGRADE_RUN_KEY } from '@/common/options/upgrade/upgradeRun'
import { UpgradeFailureBadge } from './UpgradeFailureBadge'

/**
 * UpgradeFailureBadge puts a badge on the toolbar icon while the last options
 * upgrade run is recorded as failed, including one recorded before the
 * worker started, and removes it when a new run starts or succeeds.
 */

const failedRun = {
  status: 'failed',
  attempts: 1,
  failedAt: 0,
  message: 'IO error',
}

function badgeText() {
  const setBadgeText = vi
    .spyOn(fakeBrowser.action, 'setBadgeText')
    .mockResolvedValue(undefined)
  vi.spyOn(fakeBrowser.action, 'setBadgeBackgroundColor').mockResolvedValue(
    undefined
  )
  return () => setBadgeText.mock.lastCall?.[0].text
}

describe('UpgradeFailureBadge', () => {
  it('shows a badge for a failure recorded before the worker started', async () => {
    await fakeBrowser.storage.local.set({ [UPGRADE_RUN_KEY]: failedRun })
    const lastText = badgeText()

    new UpgradeFailureBadge().setup()

    await vi.waitFor(() => {
      expect(lastText()).toBe('!')
    })
  })

  it('shows the badge when a run fails and clears it when the next one starts', async () => {
    const lastText = badgeText()
    new UpgradeFailureBadge().setup()
    await vi.waitFor(() => {
      expect(lastText()).toBe('')
    })

    await fakeBrowser.storage.local.set({ [UPGRADE_RUN_KEY]: failedRun })
    await vi.waitFor(() => {
      expect(lastText()).toBe('!')
    })

    await fakeBrowser.storage.local.set({
      [UPGRADE_RUN_KEY]: { status: 'running', attempts: 1 },
    })
    await vi.waitFor(() => {
      expect(lastText()).toBe('')
    })
  })
})
