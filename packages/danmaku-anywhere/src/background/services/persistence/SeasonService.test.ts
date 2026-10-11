import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DANMAKU_DB_NAME, DanmakuAnywhereDb } from '@/common/db/db'
import { makeSeasonInsert } from '@/tests/factories'
import { SeasonService } from './SeasonService'

/**
 * Exercises season identity at the persistence layer against a real (in-memory)
 * Dexie: a season is the same row when providerConfigId and indexedId match,
 * two configs (even for one server) keep separate rows, and an orphan whose
 * config was deleted still dedups onto its own row.
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

const SERVER_A = 'd9d068cc-d7a5-4277-990b-73b28f7637f8'
const SERVER_A_AGAIN = '0f6a3c52-91b4-4c1e-8f0d-2b7e5a9c4d13'

describe('SeasonService identity', () => {
  it('updates the row with the same providerConfigId and indexedId', async () => {
    const season = makeSeasonInsert({
      providerConfigId: 'dandanplay',
      indexedId: '17981',
    })
    const first = await service.upsert(season)
    const second = await service.upsert({ ...season, title: 'Renamed' })

    expect(second.id).toBe(first.id)
    expect(second.title).toBe('Renamed')
    expect(second.version).toBe(2)
    expect(await db.season.count()).toBe(1)
  })

  it('keeps separate rows for two configs pointing at the same server', async () => {
    const first = await service.upsert(
      makeSeasonInsert({ providerConfigId: SERVER_A, indexedId: '100' })
    )
    const second = await service.upsert(
      makeSeasonInsert({ providerConfigId: SERVER_A_AGAIN, indexedId: '100' })
    )

    expect(second.id).not.toBe(first.id)
    expect(await db.season.count()).toBe(2)
  })

  it('keeps a built-in and a self-hosted season with the same indexedId apart', async () => {
    await service.upsert(
      makeSeasonInsert({ providerConfigId: 'dandanplay', indexedId: '100' })
    )
    await service.upsert(
      makeSeasonInsert({ providerConfigId: SERVER_A, indexedId: '100' })
    )

    expect(await db.season.count()).toBe(2)
  })

  it('does not match a season with the same indexedId under another manifest config', async () => {
    const ddp = await service.upsert(
      makeSeasonInsert({ providerConfigId: 'dandanplay', indexedId: '1' })
    )
    const bili = await service.upsert(
      makeSeasonInsert({
        manifestId: 'bilibili',
        providerConfigId: 'bilibili',
        indexedId: '1',
      })
    )

    expect(bili.id).not.toBe(ddp.id)
  })

  it('finds an orphan by its own config id after the config is gone', async () => {
    const orphan = await service.upsert(
      makeSeasonInsert({ providerConfigId: SERVER_A, indexedId: '5550' })
    )

    const found = await service.findExisting(
      makeSeasonInsert({ providerConfigId: SERVER_A, indexedId: '5550' })
    )

    expect(found?.id).toBe(orphan.id)
  })
})
