import { fakeBrowser } from '@webext-core/fake-browser'
import { beforeEach, describe, expect, it } from 'vitest'
import { getOptionsStorageError } from '@/common/options/OptionsService/OptionsStorageError'
import { OptionsUpgradeService } from '@/common/options/upgrade/OptionsUpgradeService'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import {
  chromeItemBytes,
  enforceSyncQuota,
  syncBytesInUse,
} from '@/tests/syncQuota'
import { readV150Store } from '@/tests/v150Backup'
import type { DanmakuOptions } from './constant'
import { defaultDanmakuOptions } from './constant'
import { DanmakuOptionsService } from './service'

/**
 * danmakuOptions against a sync area that enforces Chrome's quotas. A v1.5.0
 * user whose single danmakuOptions item is just under the 8 KB item limit
 * upgrades through the coordinator without losing a filter, and every item
 * stays under the limit. Block lists and custom CSS far larger than one item
 * round-trip, shrink without leaving stale chunks readable, and a write past
 * the whole area's quota rejects with a typed storeFull error and leaves the
 * stored options as they were.
 */

type Filter = DanmakuOptions['filters'][number]

const KEY = 'danmakuOptions'
const PER_ITEM = 8192

function blockRule(index: number): Filter {
  return index % 3 === 0
    ? { type: 'regex', value: `^(前方高能|剧透)${index}[!！]*$`, enabled: true }
    : {
        type: 'text',
        value: `spoiler keyword ${index}`,
        enabled: index % 2 === 0,
      }
}

function rules(count: number): Filter[] {
  return Array.from({ length: count }, (_, index) => blockRule(index))
}

// v1.5.0's danmakuOptions item (version 7) grown with block rules until the
// next one would no longer fit in 7.9 KB.
function nearQuotaV150Item() {
  const fixture = readV150Store<DanmakuOptions>(KEY)
  const filters: Filter[] = []
  const item = () => ({ ...fixture, data: { ...fixture.data, filters } })
  while (chromeItemBytes(KEY, item()) < 7900) {
    filters.push(blockRule(filters.length))
  }
  return item()
}

async function syncItemSizes(): Promise<Record<string, number>> {
  const all = await fakeBrowser.storage.sync.get(null)
  return Object.fromEntries(
    Object.entries(all).map(([key, value]) => [
      key,
      chromeItemBytes(key, value),
    ])
  )
}

describe('danmakuOptions under the sync quota', () => {
  beforeEach(() => {
    enforceSyncQuota()
  })

  it('upgrades a v1.5.0 item just under the item limit and keeps every filter', async () => {
    const v150 = nearQuotaV150Item()
    expect(chromeItemBytes(KEY, v150)).toBeLessThan(PER_ITEM)
    expect(v150.data.filters.length).toBeGreaterThan(100)
    await fakeBrowser.storage.sync.set({ [KEY]: v150 })
    const container = createUpgradeContainer()

    await container.get(OptionsUpgradeService).upgrade()

    const service = container.get(DanmakuOptionsService)
    const upgraded = await service.get()
    expect(upgraded.filters).toEqual(v150.data.filters)
    expect(upgraded.customCss).toBe(v150.data.customCss)
    expect(upgraded.collapse).toEqual(defaultDanmakuOptions.collapse)
    expect(await service.options.getVersion()).toBe(
      service.options.latestVersion
    )
    const sizes = await syncItemSizes()
    for (const [key, bytes] of Object.entries(sizes)) {
      expect(bytes, key).toBeLessThanOrEqual(PER_ITEM)
    }
    const stored = await fakeBrowser.storage.sync.get(null)
    expect(Object.values(stored), 'no blanked chunk items').not.toContain('')
  })

  it('keeps the store item small whatever the block list holds', async () => {
    const service = createUpgradeContainer().get(DanmakuOptionsService)
    await service.options.upgrade()

    await service.update({ filters: rules(600), customCss: 'a{}'.repeat(3000) })

    const sizes = await syncItemSizes()
    expect(sizes[KEY]).toBeLessThan(2048)
    expect(Object.keys(sizes).length).toBeGreaterThan(4)
    for (const [key, bytes] of Object.entries(sizes)) {
      expect(bytes, key).toBeLessThanOrEqual(PER_ITEM)
    }
  })

  it('round-trips a block list several items long and then a shorter one', async () => {
    const service = createUpgradeContainer().get(DanmakuOptionsService)
    await service.options.upgrade()

    await service.update({ filters: rules(600) })
    expect((await service.get()).filters).toEqual(rules(600))

    await service.update({ filters: rules(3) })
    expect((await service.get()).filters).toEqual(rules(3))
    expect(await syncBytesInUse()).toBeLessThan(4096)
  })

  it('round-trips text that costs more stored than it looks', async () => {
    const service = createUpgradeContainer().get(DanmakuOptionsService)
    await service.options.upgrade()
    const customCss = '<style>"弹幕"\u2028\\😀</style>\n'.repeat(900)

    await service.update({ customCss })

    expect((await service.get()).customCss).toBe(customCss)
  })

  it('rejects a write past the area quota with storeFull and keeps what was stored', async () => {
    const service = createUpgradeContainer().get(DanmakuOptionsService)
    await service.options.upgrade()
    await service.update({ filters: rules(10) })

    const error = await service
      .update({ filters: rules(3000) })
      .catch((reason: unknown) => reason)

    expect(getOptionsStorageError(error)).toEqual({
      problem: 'storeFull',
      store: KEY,
    })
    expect((await service.get()).filters).toEqual(rules(10))
  })
})
