import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DANMAKU_DB_NAME, DanmakuAnywhereDb } from '@/common/db/db'
import { makeEpisode, makeSeason } from '@/tests/factories'
import { silentLogger } from '@/tests/silentLogger'
import { DanmakuService } from './DanmakuService'
import { SeasonService } from './SeasonService'

/**
 * Purging by retention age. The count shown before a purge matches what the
 * purge then deletes: whole episodes last updated before the cutoff, never
 * newer episodes and never custom episodes. Seasons left without episodes are
 * deleted too, except bookmarked ones and ones updated inside the window, and
 * season maps stop referencing them.
 */

const DAY = 24 * 60 * 60 * 1000

describe('DanmakuService purge', () => {
  let db: DanmakuAnywhereDb
  let service: DanmakuService

  beforeEach(async () => {
    await Dexie.delete(DANMAKU_DB_NAME)
    db = new DanmakuAnywhereDb()
    await db.open()
    service = new DanmakuService(new SeasonService(db), db, silentLogger)

    const now = Date.now()
    await db.episode.bulkAdd(
      [40, 31, 5].map((age, i) => {
        const { id: _, ...episode } = makeEpisode({
          indexedId: `episode-${i}`,
          timeUpdated: now - age * DAY,
        })
        return episode
      })
    )
    await service.import([
      { title: 'local.json', data: [{ p: '1,1,16777215', m: 'a' }] },
    ])
    await db.customEpisode.toCollection().modify({ timeUpdated: 0 })
  })

  afterEach(async () => {
    db.close()
    await Dexie.delete(DANMAKU_DB_NAME)
  })

  it('counts the episodes a purge would delete', async () => {
    expect(await service.countOlderThan(30)).toBe(2)
    expect(await db.episode.count()).toBe(3)
  })

  it('deletes the counted episodes and keeps the rest', async () => {
    const count = await service.countOlderThan(30)

    const deleted = await service.purgeOlderThan(30)

    expect(deleted).toBe(count)
    expect(await db.episode.count()).toBe(1)
    expect(await db.customEpisode.count()).toBe(1)
  })

  describe('empty seasons', () => {
    const oldTime = Date.now() - 60 * DAY

    async function addSeason(
      indexedId: string,
      timeUpdated: number
    ): Promise<number> {
      const { id: _, ...season } = makeSeason({ indexedId, timeUpdated })
      return db.season.add(season)
    }

    async function addEpisode(seasonId: number, timeUpdated: number) {
      const { id: _, ...episode } = makeEpisode({
        indexedId: `e-${seasonId}-${timeUpdated}`,
        seasonId,
        timeUpdated,
      })
      await db.episode.add(episode)
    }

    beforeEach(async () => {
      await db.episode.clear()
      await db.customEpisode.clear()
    })

    it('deletes a season whose last episode was purged', async () => {
      const seasonId = await addSeason('gone', oldTime)
      await addEpisode(seasonId, oldTime)

      await service.purgeOlderThan(30)

      expect(await db.season.get(seasonId)).toBeUndefined()
    })

    it('keeps a season that still has an episode', async () => {
      const seasonId = await addSeason('stays', oldTime)
      await addEpisode(seasonId, oldTime)
      await addEpisode(seasonId, Date.now())

      await service.purgeOlderThan(30)

      expect(await db.season.get(seasonId)).toBeDefined()
    })

    it('keeps a bookmarked season', async () => {
      const seasonId = await addSeason('bookmarked', oldTime)
      await db.bookmark.add({
        seasonId,
        episodes: [],
        lastRefreshed: 0,
        timeUpdated: 0,
        version: 1,
      })

      await service.purgeOlderThan(30)

      expect(await db.season.get(seasonId)).toBeDefined()
      expect(await db.bookmark.count()).toBe(1)
    })

    it('keeps a season touched inside the retention window', async () => {
      const seasonId = await addSeason('fresh', Date.now())

      await service.purgeOlderThan(30)

      expect(await db.season.get(seasonId)).toBeDefined()
    })

    it('removes the deleted season from season maps', async () => {
      const goneId = await addSeason('gone', oldTime)
      const keptId = await addSeason('kept', Date.now())
      await addEpisode(goneId, oldTime)
      await db.seasonMap.add({
        key: 'show',
        seasons: { a: goneId, b: keptId },
        seasonIds: [goneId, keptId],
      })

      await service.purgeOlderThan(30)

      const map = await db.seasonMap.get('show')
      expect(map?.seasonIds).toEqual([keptId])
      expect(map?.seasons).toEqual({ b: keptId })
    })
  })

  it('does nothing for a non-positive age', async () => {
    expect(await service.countOlderThan(0)).toBe(0)
    expect(await service.purgeOlderThan(0)).toBe(0)
    expect(await db.episode.count()).toBe(3)
  })
})
