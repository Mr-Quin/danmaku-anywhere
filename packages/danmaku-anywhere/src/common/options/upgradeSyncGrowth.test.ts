import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it } from 'vitest'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { chromeItemBytes, enforceSyncQuota } from '@/tests/syncQuota'
import { readV150Store } from '@/tests/v150Backup'
import { ExtensionOptionsService } from './extensionOptions/service'
import { ProviderConfigService } from './providerConfig/service'

/**
 * The sync stores other than danmakuOptions stay one item each, so the
 * upgrade from v1.5.0 must not be able to push one past the 8 KB item limit.
 * providerConfig is the only one of them that both holds a user-grown list
 * and is rewritten by the upgrade: every entry comes out smaller, so a long
 * list of custom sources shrinks. extensionOptions has no list and gains a
 * fixed handful of fields. mountConfig and aiProviderConfig are already at
 * their latest version in v1.5.0, so the upgrade does not write them.
 */

interface StoredList {
  data: Record<string, unknown>[]
  version: number
}

function withCustomSources(count: number): StoredList {
  const fixture = readV150Store<Record<string, unknown>[]>('providerConfig')
  const custom = fixture.data.find((entry) => entry.isBuiltIn === false)
  const extra = Array.from({ length: count }, (_, index) => {
    return {
      ...custom,
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      name: `Self-hosted ${index}`,
    }
  })
  return { ...fixture, data: [...fixture.data, ...extra] }
}

async function storedBytes(key: string): Promise<number> {
  const stored = await fakeBrowser.storage.sync.get(key)
  return chromeItemBytes(key, stored[key])
}

describe('sync stores the upgrade rewrites in place', () => {
  it('shrinks a long providerConfig list instead of growing it', async () => {
    await fakeBrowser.storage.sync.set({
      providerConfig: withCustomSources(18),
    })
    const before = await storedBytes('providerConfig')
    expect(before).toBeGreaterThan(6000)
    expect(before).toBeLessThan(8192)
    enforceSyncQuota()

    await createUpgradeContainer().get(ProviderConfigService).options.upgrade()

    const after = await storedBytes('providerConfig')
    expect(after).toBeLessThan(before)
  })

  it('grows extensionOptions by a fixed amount whatever the user set', async () => {
    const fixture = readV150Store('extensionOptions')
    await fakeBrowser.storage.sync.set({ extensionOptions: fixture })
    const before = await storedBytes('extensionOptions')

    await createUpgradeContainer()
      .get(ExtensionOptionsService)
      .options.upgrade()

    expect((await storedBytes('extensionOptions')) - before).toBeLessThan(512)
  })
})
