import { fakeBrowser } from '@webext-core/fake-browser'
import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeSeasonRow } from '@/tests/factories'
import { DANMAKU_DB_NAME, DanmakuAnywhereDb } from './db'

/**
 * Drives the real Dexie upgrade chain from a v12 database shaped like v1.5.0
 * (no bookmark store, `provider` on every row, `builtin:` prefixed config ids)
 * to the current version. Asserts that seasons end up keyed by bare
 * providerConfigId + indexedId with a manifestId, that self-hosted uuids
 * survive, that episodes, custom episodes and seasonMap ids are left as seeded,
 * and that no Chrome storage is read.
 */

const SELF_HOSTED_A = 'd9d068cc-d7a5-4277-990b-73b28f7637f8'
const SELF_HOSTED_B = '0f6a3c52-91b4-4c1e-8f0d-2b7e5a9c4d13'

const V12_STORES = {
  episode:
    '++id, provider, indexedId, &[seasonId+indexedId], seasonId, timeUpdated, lastChecked',
  season:
    '++id, provider, providerConfigId, indexedId, &[providerConfigId+indexedId]',
  customEpisode: '++id, title',
  seasonMap: 'key, *seasonIds',
}

type Row = Record<string, unknown>

interface Seed {
  seasons?: Row[]
  episodes?: Row[]
  customEpisodes?: Row[]
  seasonMaps?: Row[]
}

async function seedV12(seed: Seed): Promise<void> {
  const db = new Dexie(DANMAKU_DB_NAME)
  db.version(12).stores(V12_STORES)
  await db.open()
  await db.transaction('rw', db.tables, async () => {
    await db.table('season').bulkAdd(seed.seasons ?? [])
    await db.table('episode').bulkAdd(seed.episodes ?? [])
    await db.table('customEpisode').bulkAdd(seed.customEpisodes ?? [])
    await db.table('seasonMap').bulkAdd(seed.seasonMaps ?? [])
  })
  db.close()
}

async function openCurrent(): Promise<DanmakuAnywhereDb> {
  const db = new DanmakuAnywhereDb()
  await db.open()
  return db
}

async function seasonIndexes(db: DanmakuAnywhereDb) {
  let indexes: { name: string; unique: boolean }[] = []
  await db.transaction('r', 'season', async (tx) => {
    const store = tx.idbtrans.objectStore('season')
    indexes = Array.from(store.indexNames).map((name) => ({
      name,
      unique: store.index(name).unique,
    }))
  })
  return indexes
}

function comments(count: number, prefix: string) {
  return Array.from({ length: count }, (_, i) => ({
    cid: i,
    p: `${(i * 0.5).toFixed(2)},1,16777215,${prefix}-user-${i}`,
    m: `${prefix} comment ${i}`,
  }))
}

function v150Season(
  id: number,
  provider: string | undefined,
  providerConfigId: string,
  indexedId: string
): Row {
  return {
    id,
    ...(provider === undefined ? {} : { provider }),
    providerConfigId,
    providerIds: { animeId: id },
    title: `Show ${id}`,
    type: 'tvseries',
    indexedId,
    schemaVersion: 1,
    version: 1,
    timeUpdated: 1700000000000,
  }
}

function v150Episode(
  id: number,
  seasonId: number,
  provider: string,
  commentCount: number
): Row {
  const episodeComments = comments(commentCount, `ep${id}`)
  return {
    id,
    provider,
    seasonId,
    title: `Episode ${id}`,
    episodeNumber: id,
    providerIds: { episodeId: id * 1000 },
    indexedId: String(id * 1000),
    comments: episodeComments,
    commentCount: episodeComments.length,
    params: { chConvert: 0 },
    schemaVersion: 4,
    lastChecked: 1700000000000,
    version: 1,
    timeUpdated: 1700000000000,
  }
}

const BUILTIN_SEASONS = [
  v150Season(1, 'DanDanPlay', 'builtin:dandanplay', '17981'),
  v150Season(2, 'Bilibili', 'builtin:bilibili', '28339'),
  v150Season(3, 'Tencent', 'builtin:tencent', 'mzc00200'),
]

const BUILTIN_EPISODES = [
  v150Episode(11, 1, 'DanDanPlay', 300),
  v150Episode(12, 1, 'DanDanPlay', 250),
  v150Episode(21, 2, 'Bilibili', 400),
  v150Episode(31, 3, 'Tencent', 200),
]

let storageReads: ReturnType<typeof vi.spyOn>[] = []

beforeEach(async () => {
  await Dexie.delete(DANMAKU_DB_NAME)
  storageReads = [
    vi.spyOn(fakeBrowser.storage.sync, 'get'),
    vi.spyOn(fakeBrowser.storage.local, 'get'),
  ]
})

afterEach(async () => {
  for (const read of storageReads) {
    expect(read).not.toHaveBeenCalled()
  }
  await Dexie.delete(DANMAKU_DB_NAME)
  vi.restoreAllMocks()
})

describe('v1.5.0 (v12) database upgraded to the current version', () => {
  it('gives built-in seasons a bare config id and matching manifestId', async () => {
    await seedV12({ seasons: BUILTIN_SEASONS, episodes: BUILTIN_EPISODES })

    const db = await openCurrent()
    const seasons = await db.season.toArray()
    db.close()

    expect(
      seasons.map((s) => [s.id, s.providerConfigId, s.manifestId])
    ).toEqual([
      [1, 'dandanplay', 'dandanplay'],
      [2, 'bilibili', 'bilibili'],
      [3, 'tencent', 'tencent'],
    ])
    expect(seasons.every((s) => !('provider' in s))).toBe(true)
    expect(seasons.every((s) => !('namespaceKey' in s))).toBe(true)
    expect(seasons[0]).toMatchObject({
      title: 'Show 1',
      indexedId: '17981',
      providerIds: { animeId: 1 },
    })
  })

  it('leaves episode and custom episode rows exactly as seeded', async () => {
    const customEpisodes = [
      {
        id: 1,
        provider: 'Custom',
        title: 'Local Clip',
        comments: comments(120, 'custom'),
        commentCount: 120,
        schemaVersion: 4,
        version: 1,
        timeUpdated: 1700000000000,
      },
    ]
    await seedV12({
      seasons: BUILTIN_SEASONS,
      episodes: BUILTIN_EPISODES,
      customEpisodes,
    })

    const db = await openCurrent()
    const episodes = await db.episode.toArray()
    const custom = await db.customEpisode.toArray()
    db.close()

    expect(episodes).toEqual(BUILTIN_EPISODES)
    expect(custom).toEqual(customEpisodes)
  })

  it('keeps the uuid of a self-hosted season and stamps it as dandanplay', async () => {
    await seedV12({
      seasons: [v150Season(1, 'DanDanPlay', SELF_HOSTED_A, '5550')],
      episodes: [v150Episode(11, 1, 'DanDanPlay', 50)],
    })

    const db = await openCurrent()
    const season = await db.season.get(1)
    const episodes = await db.episode.where({ seasonId: 1 }).toArray()
    db.close()

    expect(season?.providerConfigId).toBe(SELF_HOSTED_A)
    expect(season?.manifestId).toBe('dandanplay')
    expect(episodes).toHaveLength(1)
  })

  it('keeps one row per config when two self-hosted configs and a built-in share an indexedId', async () => {
    await seedV12({
      seasons: [
        v150Season(1, 'DanDanPlay', SELF_HOSTED_A, '100'),
        v150Season(2, 'DanDanPlay', SELF_HOSTED_B, '100'),
        v150Season(3, 'DanDanPlay', 'builtin:dandanplay', '100'),
      ],
    })

    const db = await openCurrent()
    const seasons = await db.season.where({ indexedId: '100' }).toArray()
    const bySelfHostedB = await db.season.get({
      providerConfigId: SELF_HOSTED_B,
      indexedId: '100',
    })
    db.close()

    expect(seasons.map((s) => s.providerConfigId).sort()).toEqual(
      [SELF_HOSTED_A, SELF_HOSTED_B, 'dandanplay'].sort()
    )
    expect(bySelfHostedB?.id).toBe(2)
  })

  it('bares built-in seasonMap keys and leaves uuid keys and seasonIds untouched', async () => {
    await seedV12({
      seasons: [
        ...BUILTIN_SEASONS,
        v150Season(4, 'DanDanPlay', SELF_HOSTED_A, '5550'),
      ],
      seasonMaps: [
        {
          key: 'Show',
          seasons: {
            'builtin:dandanplay': 1,
            'builtin:bilibili': 2,
            'builtin:tencent': 3,
            [SELF_HOSTED_A]: 4,
          },
          seasonIds: [1, 2, 3, 4],
        },
      ],
    })

    const db = await openCurrent()
    const entry = await db.seasonMap.get('Show')
    db.close()

    expect(entry).toEqual({
      key: 'Show',
      seasons: {
        dandanplay: 1,
        bilibili: 2,
        tencent: 3,
        [SELF_HOSTED_A]: 4,
      },
      seasonIds: [1, 2, 3, 4],
    })
  })

  it('falls back to dandanplay for a uuid season whose provider tag is missing or unknown', async () => {
    await seedV12({
      seasons: [
        v150Season(1, undefined, SELF_HOSTED_A, '1'),
        v150Season(2, 'Unknown', SELF_HOSTED_B, '2'),
      ],
    })

    const db = await openCurrent()
    const seasons = await db.season.toArray()
    db.close()

    expect(seasons.map((s) => [s.providerConfigId, s.manifestId])).toEqual([
      [SELF_HOSTED_A, 'dandanplay'],
      [SELF_HOSTED_B, 'dandanplay'],
    ])
  })

  it('takes manifestId from a built-in config id over a mismatching provider tag', async () => {
    await seedV12({
      seasons: [v150Season(1, 'Bilibili', 'builtin:tencent', '1')],
    })

    const db = await openCurrent()
    const season = await db.season.get(1)
    db.close()

    expect(season?.providerConfigId).toBe('tencent')
    expect(season?.manifestId).toBe('tencent')
  })

  it('indexes seasons uniquely by providerConfigId + indexedId', async () => {
    await seedV12({ seasons: BUILTIN_SEASONS })

    const db = await openCurrent()
    const indexes = await seasonIndexes(db)
    db.close()

    const names = indexes.map((index) => index.name)
    expect(names).toEqual(
      expect.arrayContaining(['manifestId', 'providerConfigId', 'indexedId'])
    )
    expect(indexes).toContainEqual({
      name: '[providerConfigId+indexedId]',
      unique: true,
    })
    expect(names).not.toContain('[manifestId+namespaceKey+indexedId]')
    expect(names).not.toContain('namespaceKey')
    expect(names).not.toContain('provider')
  })

  it('rejects a second season with the same config id and indexedId', async () => {
    await seedV12({ seasons: BUILTIN_SEASONS })

    const db = await openCurrent()
    const duplicate = makeSeasonRow({
      providerConfigId: 'dandanplay',
      manifestId: 'dandanplay',
      indexedId: '17981',
    })
    await expect(db.season.add(duplicate)).rejects.toThrow()
    db.close()
  })

  it('creates an empty database with the same stores and indexes', async () => {
    const db = await openCurrent()
    const indexes = await seasonIndexes(db)
    const tables = db.tables.map((table) => table.name).sort()
    const seasonCount = await db.season.count()
    db.close()

    expect(tables).toEqual(
      ['bookmark', 'customEpisode', 'episode', 'season', 'seasonMap'].sort()
    )
    expect(seasonCount).toBe(0)
    expect(indexes).toContainEqual({
      name: '[providerConfigId+indexedId]',
      unique: true,
    })
  })

  it('changes nothing when the upgraded database is opened again', async () => {
    await seedV12({
      seasons: [
        ...BUILTIN_SEASONS,
        v150Season(4, 'DanDanPlay', SELF_HOSTED_A, '5550'),
      ],
      episodes: BUILTIN_EPISODES,
      seasonMaps: [
        {
          key: 'Show',
          seasons: { 'builtin:dandanplay': 1, [SELF_HOSTED_A]: 4 },
          seasonIds: [1, 4],
        },
      ],
    })

    async function snapshot() {
      const db = await openCurrent()
      const state = {
        seasons: await db.season.toArray(),
        episodes: await db.episode.toArray(),
        seasonMaps: await db.seasonMap.toArray(),
      }
      db.close()
      return state
    }

    const first = await snapshot()
    const second = await snapshot()

    expect(second).toEqual(first)
  })
})

const V9_STORES = {
  danmaku:
    '++id, provider, episodeId, seasonId, &[provider+episodeId], [provider+seasonId], timeUpdated',
  titleMapping: '++id, originalTitle, title',
}

function ddpDanmakuV3(episodeId: number, animeId: number) {
  return {
    provider: 'DanDanPlay',
    meta: {
      provider: 'DanDanPlay',
      episodeId,
      animeId,
      episodeTitle: `Episode ${episodeId}`,
      animeTitle: 'DDP Show',
    },
    comments: [],
    commentCount: 0,
    version: 1,
    timeUpdated: 1,
    schemaVersion: 3,
    params: {},
    episodeId,
    seasonId: animeId,
    episodeTitle: `Episode ${episodeId}`,
    seasonTitle: 'DDP Show',
  }
}

const biliDanmakuV3 = {
  provider: 'Bilibili',
  meta: {
    provider: 'Bilibili',
    cid: 500,
    aid: 600,
    bvid: 'BV1xx',
    seasonId: 700,
    title: 'Bili Episode',
  },
  comments: [],
  commentCount: 0,
  version: 1,
  timeUpdated: 1,
  schemaVersion: 3,
  episodeId: 500,
  seasonId: 700,
  episodeTitle: 'Bili Episode',
  seasonTitle: 'Bili Show',
}

const tencentDanmakuV3 = {
  provider: 'Tencent',
  meta: { provider: 'Tencent', cid: 'tc1', vid: 'tv1' },
  comments: [],
  commentCount: 0,
  version: 1,
  timeUpdated: 1,
  schemaVersion: 3,
  episodeTitle: 'Tencent Episode',
  seasonTitle: 'Tencent Show',
}

const customDanmakuV3 = {
  provider: 'Custom',
  meta: { provider: 'Custom', seasonTitle: 'Local', episodeTitle: 'Clip' },
  comments: [],
  commentCount: 0,
  version: 1,
  timeUpdated: 1,
  schemaVersion: 3,
  episodeTitle: 'Clip',
  seasonTitle: 'Local',
}

describe('pre-v10 database upgraded to the current version', () => {
  it('keeps one season per show with every episode still attached', async () => {
    const legacy = new Dexie(DANMAKU_DB_NAME)
    legacy.version(9).stores(V9_STORES)
    await legacy.open()
    await legacy
      .table('danmaku')
      .bulkAdd([
        ddpDanmakuV3(10001, 100),
        ddpDanmakuV3(10002, 100),
        biliDanmakuV3,
        tencentDanmakuV3,
        customDanmakuV3,
      ])
    legacy.close()

    const db = await openCurrent()
    const seasons = await db.season.toArray()
    const episodes = await db.episode.toArray()
    const customEpisodes = await db.customEpisode.toArray()
    db.close()

    expect(
      seasons.map((s) => [s.manifestId, s.providerConfigId, s.indexedId]).sort()
    ).toEqual([
      ['bilibili', 'bilibili', '700'],
      ['dandanplay', 'dandanplay', '100'],
      ['tencent', 'tencent', 'tc1'],
    ])
    expect(episodes).toHaveLength(4)
    const seasonIds = new Set(seasons.map((s) => s.id))
    expect(episodes.every((e) => seasonIds.has(e.seasonId))).toBe(true)
    const ddpSeason = seasons.find((s) => s.manifestId === 'dandanplay')
    expect(
      episodes
        .filter((e) => e.seasonId === ddpSeason?.id)
        .map((e) => e.indexedId)
        .sort()
    ).toEqual(['10001', '10002'])
    expect(customEpisodes.map((c) => c.title)).toEqual(['Clip'])
  })
})
