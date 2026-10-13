import 'fake-indexeddb/auto'
import { ManifestRunner } from '@mr-quin/dango'
import { fakeBrowser } from '@webext-core/fake-browser'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BookmarkService } from '@/background/services/persistence/BookmarkService'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import { DANMAKU_DB_NAME, DanmakuAnywhereDb } from '@/common/db/db'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { makeProviderConfig, makeSeasonInsert } from '@/tests/factories'
import { ManifestRegistry } from './ManifestRegistry'
import { ProviderService } from './ProviderService'

const dandanplay = makeProviderConfig({ id: 'dandanplay', name: 'DDP' })

async function seedProviders(
  ...configs: ReturnType<typeof makeProviderConfig>[]
) {
  await fakeBrowser.storage.sync.set({
    providerConfig: { version: 5, data: configs },
  })
}

function holdStoredManifests() {
  const release = Promise.withResolvers<Record<string, unknown>>()
  const get = fakeBrowser.storage.local.get.bind(fakeBrowser.storage.local)
  vi.spyOn(fakeBrowser.storage.local, 'get').mockImplementation((keys) => {
    if (keys === 'manifests') {
      return release.promise
    }
    return get(keys)
  })
  return () => release.resolve({})
}

function settle<T>(promise: Promise<T>) {
  return promise.then(
    (value) => ({ value }),
    (error: Error) => ({ error: error.message })
  )
}

beforeEach(async () => {
  await Dexie.delete(DANMAKU_DB_NAME)
})

afterEach(async () => {
  await Dexie.delete(DANMAKU_DB_NAME)
})

describe('ProviderService while the manifest registry is loading', () => {
  it('runs a search once the stored manifests have been read', async () => {
    await seedProviders(dandanplay)
    const release = holdStoredManifests()
    vi.spyOn(ManifestRunner.prototype, 'runSearch').mockResolvedValue([])
    const service = createUpgradeContainer().get(ProviderService)

    const pending = settle(
      service.searchSeason({ providerConfigId: 'dandanplay', keyword: 'test' })
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    release()

    expect(await pending).toEqual({ value: [] })
  })

  it('recognizes a pasted URL once the stored manifests have been read', async () => {
    await seedProviders(dandanplay)
    const release = holdStoredManifests()
    vi.spyOn(ManifestRunner.prototype, 'runParseUrl').mockResolvedValue({
      seasonInsert: {
        providerIds: { animeId: 1 },
        indexedId: '1',
        title: 'Show',
        type: 'tv',
      },
      episodeMeta: {
        providerIds: { episodeId: 2 },
        indexedId: '2',
        title: 'E',
      },
    })
    const service = createUpgradeContainer().get(ProviderService)

    const pending = settle(service.parseUrl('https://example.com/play/1'))
    await new Promise((resolve) => setTimeout(resolve, 0))
    release()

    expect(await pending).toMatchObject({
      value: { indexedId: '2', season: { providerConfigId: 'dandanplay' } },
    })
  })

  it('serves a cached episode without waiting for the manifests', async () => {
    await seedProviders(dandanplay)
    holdStoredManifests()
    const container = createUpgradeContainer()
    const season = await container
      .get(SeasonService)
      .upsert(makeSeasonInsert({ providerConfigId: 'dandanplay' }))
    const meta = {
      title: 'Episode 1',
      indexedId: 'ep1',
      seasonId: season.id,
      providerIds: {},
      schemaVersion: 4 as const,
      lastChecked: 0,
    }
    await container.get(DanmakuService).upsert({
      ...meta,
      comments: [{ p: '0,1,16777215', m: 'hi' }],
      commentCount: 1,
    })

    const result = await container.get(ProviderService).getDanmaku({
      type: 'by-meta',
      meta: { ...meta, season },
    })

    expect(result.episode).toMatchObject({ indexedId: 'ep1', commentCount: 1 })
  })
})

describe('ProviderService.deleteUserManifest over real storage', () => {
  it('finishes the bookmark cleanup on a retry after the first attempt failed', async () => {
    await seedProviders(
      makeProviderConfig({ id: 'source-1', manifestId: 'mine:one' })
    )
    const container = createUpgradeContainer()
    const registry = container.get(ManifestRegistry)
    await registry.saveUserManifest(
      {
        apiVersion: 1,
        id: 'mine:one',
        name: 'Mine',
        version: '1.0.0',
        hosts: ['example.com'],
        identityFields: [],
      },
      'create'
    )
    const db = container.get(DanmakuAnywhereDb)
    const season = await container.get(SeasonService).upsert(
      makeSeasonInsert({
        manifestId: 'mine:one',
        providerConfigId: 'source-1',
      })
    )
    await db.bookmark.add({
      seasonId: season.id,
      episodes: [],
      lastRefreshed: 0,
      version: 1,
      timeUpdated: 0,
    })
    vi.spyOn(
      container.get(BookmarkService),
      'deleteByProviderConfig'
    ).mockRejectedValueOnce(new Error('temporary database error'))
    const service = container.get(ProviderService)

    await expect(service.deleteUserManifest('mine:one')).rejects.toThrow(
      'temporary database error'
    )
    await service.deleteUserManifest('mine:one')

    expect(await db.bookmark.count()).toBe(0)
    expect(await container.get(ProviderConfigService).getAll()).toEqual([])
    expect(await registry.getSource('mine:one')).toBeUndefined()
  })
})
