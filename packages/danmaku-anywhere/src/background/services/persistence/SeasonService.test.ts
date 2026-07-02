import 'fake-indexeddb/auto'
import type { SeasonInsert } from '@danmaku-anywhere/danmaku-converter'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DANMAKU_DB_NAME, DanmakuAnywhereDb } from '@/common/db/db'
import { SeasonService } from './SeasonService'

/**
 * Exercises season identity at the persistence layer against a real (in-memory)
 * Dexie: a season carrying manifestId + namespaceKey dedups on upsert, while an
 * orphaned season with no identity neither throws nor dedups (findExisting
 * short-circuits the compound-index query that would otherwise DataError).
 */

function makeSeason(overrides: Partial<SeasonInsert>): SeasonInsert {
  return {
    title: 'Show',
    type: '',
    indexedId: 'idx-1',
    providerIds: {},
    version: 1,
    timeUpdated: 0,
    schemaVersion: 1,
    ...overrides,
  } as SeasonInsert
}

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
    const season = makeSeason({
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
    const orphan = makeSeason({
      manifestId: undefined,
      namespaceKey: undefined,
    })
    await expect(service.findExisting(orphan)).resolves.toBeUndefined()
  })

  it('inserts an identity-less season on upsert', async () => {
    const orphan = makeSeason({
      manifestId: undefined,
      namespaceKey: undefined,
    })
    const saved = await service.upsert(orphan)

    expect(saved.id).toBeGreaterThan(0)
    expect(await db.season.count()).toBe(1)
  })
})
