import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DANMAKU_DB_NAME, DanmakuAnywhereDb } from '@/common/db/db'
import { makeEpisode, makeSeasonInsert } from '@/tests/factories'
import { silentLogger } from '@/tests/silentLogger'
import { DanmakuService } from './DanmakuService'
import { SeasonService } from './SeasonService'

/**
 * Exercises DanmakuService against a real Dexie over fake-indexeddb rather than
 * a stubbed persistence layer, so import() is measured against the same
 * transactions and the same SeasonService orphan dedup that production uses.
 */

function makeRegularBackupItem(overrides: {
  title: string
  seasonTitle: string
  indexedId: string
}) {
  return {
    provider: 'DanDanPlay',
    seasonId: 12345,
    title: overrides.title,
    providerIds: { episodeId: 179810001 },
    indexedId: overrides.indexedId,
    comments: [{ cid: 1722521763, p: '0.01,1,16777215,user', m: 'hi' }],
    commentCount: 1,
    params: { chConvert: 0, withRelated: true, from: 0 },
    schemaVersion: 4,
    lastChecked: 0,
    season: {
      provider: 'DanDanPlay',
      providerIds: { animeId: 17981, bangumiId: '17981' },
      title: overrides.seasonTitle,
      type: '',
      indexedId: '17981',
      schemaVersion: 1,
    },
  }
}

function makeEpisodeInsert(overrides: Parameters<typeof makeEpisode>[0]) {
  const {
    id: _id,
    version: _version,
    timeUpdated: _timeUpdated,
    ...insert
  } = makeEpisode(overrides)
  return insert
}

let db: DanmakuAnywhereDb
let seasonService: SeasonService
let service: DanmakuService

beforeEach(async () => {
  await Dexie.delete(DANMAKU_DB_NAME)
  db = new DanmakuAnywhereDb()
  await db.open()
  seasonService = new SeasonService(db)
  service = new DanmakuService(seasonService, db, silentLogger)
})

afterEach(async () => {
  db.close()
  await Dexie.delete(DANMAKU_DB_NAME)
})

describe('DanmakuService.import', () => {
  it('imports a raw comment array as Custom, never reaching the backup parser', async () => {
    const result = await service.import([
      {
        title: 'raw comments',
        data: [{ p: '12.5,1,16777215', m: 'hello' }],
      },
    ])

    expect(result.success).toEqual([{ title: 'raw comments', type: 'Custom' }])
    expect(result.error).toHaveLength(0)
    const stored = await service.filterCustom({ all: true })
    expect(stored).toHaveLength(1)
    expect(stored[0].title).toBe('raw comments')
  })

  it('imports a multi-episode backup of one season into a single season row', async () => {
    const items = [
      makeRegularBackupItem({
        title: 'Episode 1',
        seasonTitle: 'Show A',
        indexedId: '17981-1',
      }),
      makeRegularBackupItem({
        title: 'Episode 2',
        seasonTitle: 'Show A',
        indexedId: '17981-2',
      }),
    ]

    const result = await service.import([{ title: 'backup', data: items }])

    expect(await db.season.count()).toBe(1)
    expect(await db.episode.count()).toBe(2)
    expect(result.error).toHaveLength(0)
    const [{ result: importResult }] = result.success as {
      result: { imported: Record<string, unknown[]> }
    }[]
    expect(importResult.imported['Show A']).toHaveLength(2)
  })

  it('counts a throwing item as skipped and still imports the rest of the batch', async () => {
    const goodItem = makeRegularBackupItem({
      title: 'Episode 1',
      seasonTitle: 'Show B',
      indexedId: '17981-3',
    })
    const badItem = { ...goodItem, seasonId: undefined }

    const result = await service.import([
      { title: 'backup', data: [badItem, goodItem] },
    ])

    expect(await db.episode.count()).toBe(1)
    const [{ result: importResult }] = result.success as {
      result: { skipped: number; imported: Record<string, unknown[]> }
    }[]
    expect(importResult.skipped).toBe(1)
    expect(importResult.imported['Show B']).toHaveLength(1)
  })

  it('reports an item that is neither Custom nor a parseable backup as an error keyed by title', async () => {
    const result = await service.import([
      { title: 'garbage', data: { nonsense: true } },
    ])

    expect(result.success).toHaveLength(0)
    expect(result.error).toHaveLength(1)
    expect(result.error[0].title).toBe('garbage')
  })
})

describe('DanmakuService.add', () => {
  it('rejects an episode whose seasonId does not exist', async () => {
    await expect(
      service.add(makeEpisodeInsert({ seasonId: 999 }))
    ).rejects.toThrow('Season 999 not found')
    expect(await db.episode.count()).toBe(0)
  })
})

describe('DanmakuService.matchLocalByTitle', () => {
  it('matches a custom episode by the last path segment', async () => {
    await service.addCustom({
      title: '/Show/S01/E01.mkv',
      comments: [],
      commentCount: 0,
      schemaVersion: 4,
    })

    const match = await service.matchLocalByTitle('E01.mkv')

    expect(match?.title).toBe('/Show/S01/E01.mkv')
  })

  it('returns undefined when no custom episode matches', async () => {
    const match = await service.matchLocalByTitle('nonexistent.mkv')

    expect(match).toBeUndefined()
  })
})

describe('DanmakuService.purgeOlderThan', () => {
  async function seedEpisode(
    seasonId: number,
    indexedId: string,
    timeUpdated: number
  ) {
    const added = await service.add(makeEpisodeInsert({ seasonId, indexedId }))
    await db.episode.update(added.id, { timeUpdated })
  }

  it('does nothing and returns 0 for a non-positive day count', async () => {
    const season = await seasonService.upsert(makeSeasonInsert())
    await seedEpisode(season.id, 'ep-1', Date.now())

    const deleted = await service.purgeOlderThan(0)

    expect(deleted).toBe(0)
    expect(await db.episode.count()).toBe(1)
  })

  it('deletes only episodes older than the threshold', async () => {
    const season = await seasonService.upsert(makeSeasonInsert())
    const dayMs = 24 * 60 * 60 * 1000
    await seedEpisode(season.id, 'ep-old', Date.now() - 2 * dayMs)
    await seedEpisode(season.id, 'ep-new', Date.now())

    const deleted = await service.purgeOlderThan(1)

    expect(deleted).toBe(1)
    expect(await db.episode.count()).toBe(1)
  })
})
