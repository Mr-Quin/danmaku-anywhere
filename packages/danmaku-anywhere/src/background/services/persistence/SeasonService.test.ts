import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DANMAKU_DB_NAME, DanmakuAnywhereDb } from '@/common/db/db'
import { makeSeasonInsert } from '@/tests/factories'
import { SeasonService } from './SeasonService'

/**
 * Exercises season identity at the persistence layer against a real (in-memory)
 * Dexie: a season carrying manifestId + namespaceKey dedups on upsert via the
 * compound index, while an orphaned season with no identity dedups structurally
 * on indexedId + title against other orphans only (never onto an
 * identity-bearing row), so multi-episode backups import into one season.
 */

let db: DanmakuAnywhereDb
let service: SeasonService

beforeEach(async () => {
  await Dexie.delete(DANMAKU_DB_NAME)
  db = new DanmakuAnywhereDb()
  await db.open()
  service = new SeasonService(db)
})

afterEach(async () => {
  db.close()
  await Dexie.delete(DANMAKU_DB_NAME)
})

describe('SeasonService identity', () => {
  it('dedups a season on its manifestId + namespaceKey + indexedId', async () => {
    const season = makeSeasonInsert({
      manifestId: 'dandanplay',
      namespaceKey: 'dandanplay',
      indexedId: '17981',
    })
    const first = await service.upsert(season)
    const second = await service.upsert({ ...season, title: 'Renamed' })

    expect(second.id).toBe(first.id)
    expect(await db.season.count()).toBe(1)
  })

  it('returns undefined from findExisting for an identity-less season instead of throwing', async () => {
    const orphan = makeSeasonInsert({
      manifestId: undefined,
      namespaceKey: undefined,
    })
    await expect(service.findExisting(orphan)).resolves.toBeUndefined()
  })

  it('inserts an identity-less season on upsert', async () => {
    const orphan = makeSeasonInsert({
      manifestId: undefined,
      namespaceKey: undefined,
    })
    const saved = await service.upsert(orphan)

    expect(saved.id).toBeGreaterThan(0)
    expect(await db.season.count()).toBe(1)
  })

  it('dedups identity-less seasons on indexedId + title across upserts', async () => {
    const first = await service.upsert(makeSeasonInsert({}))
    const second = await service.upsert(makeSeasonInsert({}))

    expect(second.id).toBe(first.id)
    expect(await db.season.count()).toBe(1)
  })

  it('keeps identity-less seasons with different titles separate', async () => {
    await service.upsert(makeSeasonInsert({ title: 'Show A' }))
    await service.upsert(makeSeasonInsert({ title: 'Show B' }))

    expect(await db.season.count()).toBe(2)
  })

  it('does not match an identity-less season onto an identity-bearing row', async () => {
    const live = await service.upsert(
      makeSeasonInsert({ manifestId: 'bilibili', namespaceKey: 'bilibili' })
    )
    const orphan = await service.upsert(makeSeasonInsert({}))

    expect(orphan.id).not.toBe(live.id)
    expect(await db.season.count()).toBe(2)
  })
})
