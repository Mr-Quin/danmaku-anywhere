import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DANMAKU_DB_NAME, DanmakuAnywhereDb } from '@/common/db/db'
import { makeEpisode } from '@/tests/factories'
import { silentLogger } from '@/tests/silentLogger'
import { DanmakuService } from './DanmakuService'
import { SeasonService } from './SeasonService'

/**
 * Purging by retention age. The count shown before a purge matches what the
 * purge then deletes: whole episodes last updated before the cutoff, never
 * newer episodes and never custom episodes.
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

  it('does nothing for a non-positive age', async () => {
    expect(await service.countOlderThan(0)).toBe(0)
    expect(await service.purgeOlderThan(0)).toBe(0)
    expect(await db.episode.count()).toBe(3)
  })
})
