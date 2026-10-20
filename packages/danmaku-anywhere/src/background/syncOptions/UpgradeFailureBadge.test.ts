import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { IconService } from '@/background/services/IconService'
import { EXTENSION_VERSION } from '@/common/constants'
import { UPGRADE_RUN_KEY } from '@/common/options/upgrade/upgradeRun'
import { UpgradeFailureBadge } from './UpgradeFailureBadge'

// lint-specs-allow-unused-mock: IconService, imported through the alias, checks isServiceWorker when constructed
vi.mock('@/common/utils/utils', async (importOriginal) => {
  return {
    ...(await importOriginal<object>()),
    isServiceWorker: () => true,
  }
})

/**
 * UpgradeFailureBadge puts a badge on the toolbar icon, globally and on every
 * open tab, while this build has a failed options upgrade recorded, including
 * one recorded before the worker started. It clears the badge when an upgrade
 * succeeds and removes the record, and ignores a failure from an earlier
 * build. While it shows, IconService leaves per-tab badge text
 * alone, since that would hide the global badge on the tab.
 */

const failedRun = {
  status: 'failed',
  build: EXTENSION_VERSION,
  attempts: 1,
  failedAt: 0,
  message: 'IO error',
}

function watchBadges() {
  const texts = new Map<number | 'global', string>()
  vi.spyOn(fakeBrowser.action, 'setBadgeText').mockImplementation(
    async ({ text, tabId }) => {
      texts.set(tabId ?? 'global', text ?? '')
    }
  )
  vi.spyOn(fakeBrowser.action, 'setBadgeBackgroundColor').mockResolvedValue(
    undefined
  )
  vi.spyOn(fakeBrowser.action, 'setIcon').mockResolvedValue(undefined)
  return texts
}

async function openTab(): Promise<number> {
  const tab = await fakeBrowser.tabs.create({ url: 'https://example.com' })
  if (tab.id === undefined) {
    throw new Error('the fake tab has no id')
  }
  return tab.id
}

describe('UpgradeFailureBadge', () => {
  it('shows a badge for a failure recorded before the worker started', async () => {
    await fakeBrowser.storage.local.set({ [UPGRADE_RUN_KEY]: failedRun })
    const tabId = await openTab()
    const texts = watchBadges()

    new UpgradeFailureBadge().setup()

    await vi.waitFor(() => {
      expect([texts.get('global'), texts.get(tabId)]).toEqual(['!', '!'])
    })
  })

  it('shows the badge when a run fails and clears it once an upgrade succeeds', async () => {
    const tabId = await openTab()
    const texts = watchBadges()
    new UpgradeFailureBadge().setup()

    await fakeBrowser.storage.local.set({ [UPGRADE_RUN_KEY]: failedRun })
    await vi.waitFor(() => {
      expect([texts.get('global'), texts.get(tabId)]).toEqual(['!', '!'])
    })

    await fakeBrowser.storage.local.remove(UPGRADE_RUN_KEY)
    await vi.waitFor(() => {
      expect([texts.get('global'), texts.get(tabId)]).toEqual(['', ''])
    })
  })

  it('shows no badge for a failure from an earlier build', async () => {
    await fakeBrowser.storage.local.set({
      [UPGRADE_RUN_KEY]: { ...failedRun, build: '0.0.1' },
    })
    const badge = new UpgradeFailureBadge()
    watchBadges()

    badge.setup()
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(badge.isShowing()).toBe(false)
  })

  it('keeps per-tab comment counts from covering the badge', async () => {
    await fakeBrowser.storage.local.set({ [UPGRADE_RUN_KEY]: failedRun })
    const tabId = await openTab()
    const texts = watchBadges()
    const badge = new UpgradeFailureBadge()
    badge.setup()
    await vi.waitFor(() => {
      expect(badge.isShowing()).toBe(true)
    })

    await new IconService(badge).setActive(tabId, 120)

    expect(texts.get(tabId)).toBe('!')
  })
})
