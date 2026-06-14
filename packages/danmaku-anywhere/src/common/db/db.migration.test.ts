import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DANMAKU_DB_NAME, DanmakuAnywhereDb } from './db'

/**
 * Drives the real Dexie v14 to v15 upgrade callback against seeded rows to lock
 * down the season-identity backfill: built-in seasons heal to their structural
 * identity, custom self-hosted seasons deterministically orphan (keeping their
 * row and danmaku) without consulting provider-config storage, and the dead
 * provider / providerConfigId fields are dropped everywhere.
 */

const CUSTOM_DDP_ID = 'd9d068cc-d7a5-4277-990b-73b28f7637f8'

// v14 schema: the season shape before identity backfill, with the now-dead
// provider / providerConfigId fields and their indexes.
const V14_STORES = {
  episode:
    '++id, provider, indexedId, &[seasonId+indexedId], seasonId, timeUpdated, lastChecked',
  season:
    '++id, provider, providerConfigId, indexedId, &[providerConfigId+indexedId]',
  customEpisode: '++id, title',
  seasonMap: 'key, *seasonIds',
  bookmark: '++id, &seasonId, providerConfigId',
}

interface Seed {
  seasons?: Record<string, unknown>[]
  episodes?: Record<string, unknown>[]
  customEpisodes?: Record<string, unknown>[]
  seasonMaps?: Record<string, unknown>[]
  bookmarks?: Record<string, unknown>[]
}

async function seedV14(seed: Seed): Promise<void> {
  const db = new Dexie(DANMAKU_DB_NAME)
  db.version(14).stores(V14_STORES)
  await db.open()
  await db.transaction('rw', db.tables, async () => {
    for (const s of seed.seasons ?? []) await db.table('season').add(s)
    for (const e of seed.episodes ?? []) await db.table('episode').add(e)
    for (const c of seed.customEpisodes ?? [])
      await db.table('customEpisode').add(c)
    for (const m of seed.seasonMaps ?? []) await db.table('seasonMap').add(m)
    for (const b of seed.bookmarks ?? []) await db.table('bookmark').add(b)
  })
  db.close()
}

async function upgradeToV15(): Promise<DanmakuAnywhereDb> {
  const db = new DanmakuAnywhereDb()
  await db.open()
  return db
}

beforeEach(async () => {
  await Dexie.delete(DANMAKU_DB_NAME)
})

afterEach(async () => {
  await Dexie.delete(DANMAKU_DB_NAME)
  vi.restoreAllMocks()
})

describe('season identity migration (v15)', () => {
  it('orphans a custom self-hosted season even when its config exists in storage', async () => {
    vi.mocked(chrome.storage.sync.get).mockResolvedValue({
      providerConfig: {
        data: [
          {
            id: CUSTOM_DDP_ID,
            manifestId: 'dandanplay',
            configValues: { baseUrl: 'https://my.server/api' },
          },
        ],
      },
    } as never)
    await seedV14({
      seasons: [
        {
          id: 1,
          provider: 'DanDanPlay',
          providerConfigId: CUSTOM_DDP_ID,
          indexedId: 'custom-1',
          title: 'Custom Show',
        },
      ],
    })

    const db = await upgradeToV15()
    const season = (await db.season.get(1)) as Record<string, unknown>
    db.close()

    expect(season.manifestId).toBeUndefined()
    expect(season.namespaceKey).toBeUndefined()
    expect('provider' in season).toBe(false)
    expect('providerConfigId' in season).toBe(false)
    // The upgrade must recover identity from the row alone; reading provider
    // config storage here would race the options migration.
    expect(chrome.storage.sync.get).not.toHaveBeenCalled()
  })

  it('heals built-in seasons to their structural identity', async () => {
    await seedV14({
      seasons: [
        {
          id: 1,
          provider: 'Bilibili',
          providerConfigId: 'bilibili',
          indexedId: 'b1',
        },
        {
          id: 2,
          provider: 'DanDanPlay',
          providerConfigId: 'builtin:dandanplay',
          indexedId: 'd1',
        },
      ],
    })

    const db = await upgradeToV15()
    const [bili, ddp] = await Promise.all([db.season.get(1), db.season.get(2)])
    db.close()

    expect(bili).toMatchObject({
      manifestId: 'bilibili',
      namespaceKey: 'bilibili',
    })
    expect(ddp).toMatchObject({
      manifestId: 'dandanplay',
      namespaceKey: 'dandanplay',
    })
  })

  it('keeps an orphaned season row and its episodes', async () => {
    await seedV14({
      seasons: [
        {
          id: 1,
          provider: 'DanDanPlay',
          providerConfigId: CUSTOM_DDP_ID,
          indexedId: 'custom-1',
          title: 'Custom Show',
        },
      ],
      episodes: [
        { id: 1, seasonId: 1, provider: 'DanDanPlay', indexedId: 'e1' },
        { id: 2, seasonId: 1, provider: 'DanDanPlay', indexedId: 'e2' },
      ],
    })

    const db = await upgradeToV15()
    const season = (await db.season.get(1)) as Record<string, unknown>
    const episodes = (await db.episode
      .where('seasonId')
      .equals(1)
      .toArray()) as Record<string, unknown>[]
    db.close()

    expect(season.title).toBe('Custom Show')
    expect(season.manifestId).toBeUndefined()
    expect(episodes).toHaveLength(2)
    expect(episodes.every((e) => !('provider' in e))).toBe(true)
  })

  it('rekeys built-in seasonMap entries and drops custom ones', async () => {
    await seedV14({
      seasonMaps: [
        {
          key: 'tt-1',
          seasons: { bilibili: 1, [CUSTOM_DDP_ID]: 2 },
          seasonIds: [1, 2],
        },
      ],
    })

    const db = await upgradeToV15()
    const entry = (await db.seasonMap.get('tt-1')) as {
      seasons: Record<string, number>
      seasonIds: number[]
    }
    db.close()

    expect(entry.seasons).toEqual({ bilibili: 1 })
    expect(entry.seasonIds).toEqual([1])
  })

  it('drops providerConfigId from bookmarks and provider from custom episodes', async () => {
    await seedV14({
      bookmarks: [{ id: 1, seasonId: 1, providerConfigId: CUSTOM_DDP_ID }],
      customEpisodes: [{ id: 1, title: 'Local Clip', provider: 'MacCMS' }],
    })

    const db = await upgradeToV15()
    const [bookmark, custom] = await Promise.all([
      db.bookmark.get(1) as Promise<Record<string, unknown>>,
      db.customEpisode.get(1) as Promise<Record<string, unknown>>,
    ])
    db.close()

    expect('providerConfigId' in bookmark).toBe(false)
    expect('provider' in custom).toBe(false)
    expect(custom.title).toBe('Local Clip')
  })
})
