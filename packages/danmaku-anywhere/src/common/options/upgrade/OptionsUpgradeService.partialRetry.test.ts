import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { OptionsUpgradeService } from './OptionsUpgradeService'

/**
 * A retry after a partial upgrade migrates from the data the first attempt
 * started with. The mountConfig v5 step reads the integration policy store to
 * tell AI mounts from XPath ones. If the policy store was already upgraded
 * (which empties its options) when mountConfig failed, the retry must still
 * see useAI from before, or every AI mount turns into an XPath one.
 */

const aiPolicy = {
  id: 'policy-ai',
  name: 'AI policy',
  policy: {
    title: { selector: [], regex: [] },
    episode: { selector: [], regex: [] },
    season: { selector: [], regex: [] },
    episodeTitle: { selector: [], regex: [] },
    options: {
      titleOnly: false,
      dandanplay: { useMatchApi: false },
      useAI: true,
    },
  },
}

const aiMount = {
  name: 'AI site',
  patterns: ['https://ai.example.com/*'],
  mediaQuery: 'video',
  enabled: true,
  integration: 'policy-ai',
}

async function readStored(area: 'sync' | 'local', key: string) {
  const stored = await fakeBrowser.storage[area].get(key)
  return stored[key] as { version: number; data: unknown } | undefined
}

describe('retrying a partial options upgrade', () => {
  it('keeps an AI mount when the policy store was upgraded before mountConfig failed', async () => {
    await fakeBrowser.storage.local.set({
      xpathPolicy: { data: [aiPolicy], version: 3 },
    })
    await fakeBrowser.storage.sync.set({
      mountConfig: { data: [aiMount], version: 4 },
    })
    const set = fakeBrowser.storage.sync.set.bind(fakeBrowser.storage.sync)
    const failing = vi
      .spyOn(fakeBrowser.storage.sync, 'set')
      .mockImplementation(async (items) => {
        if ('mountConfig' in items) {
          throw new Error('QUOTA_BYTES quota exceeded')
        }
        return set(items)
      })

    await expect(
      createUpgradeContainer({ ready: false })
        .get(OptionsUpgradeService)
        .upgrade()
    ).rejects.toThrow(/mountConfig/)
    expect(await readStored('local', 'xpathPolicy')).toMatchObject({
      version: 4,
    })
    failing.mockRestore()

    await createUpgradeContainer({ ready: false })
      .get(OptionsUpgradeService)
      .upgrade()

    const mounts = await readStored('sync', 'mountConfig')
    expect(mounts?.data).toEqual([
      expect.objectContaining({ name: 'AI site', mode: 'ai' }),
    ])
  })
})
