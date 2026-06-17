import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { computeNamespaceKey } from '@/common/providers/namespaceKey'
import { DANMAKU_DB_NAME, DanmakuAnywhereDb } from './db'
import { reconcileSeasonIdentity } from './seasonIdentityReconciler'

/**
 * Drives the real v15 migration to produce an orphaned self-hosted season (one
 * that keeps its providerConfigId), then exercises the runtime reconciler that
 * heals it back to a manifestId + namespaceKey from a live provider config.
 */

const CUSTOM_DDP_ID = 'd9d068cc-d7a5-4277-990b-73b28f7637f8'
const BASE_URL = 'https://my.server/api'

const V14_STORES = {
  episode:
    '++id, provider, indexedId, &[seasonId+indexedId], seasonId, timeUpdated, lastChecked',
  season:
    '++id, provider, providerConfigId, indexedId, &[providerConfigId+indexedId]',
  customEpisode: '++id, title',
  seasonMap: 'key, *seasonIds',
  bookmark: '++id, &seasonId, providerConfigId',
}

const config = {
  id: CUSTOM_DDP_ID,
  manifestId: 'dandanplay',
  configValues: { baseUrl: BASE_URL },
}

async function seedOrphanAndUpgrade(): Promise<DanmakuAnywhereDb> {
  const seed = new Dexie(DANMAKU_DB_NAME)
  seed.version(14).stores(V14_STORES)
  await seed.open()
  await seed.table('season').add({
    id: 1,
    provider: 'DanDanPlay',
    providerConfigId: CUSTOM_DDP_ID,
    indexedId: 'custom-1',
    title: 'Custom Show',
    version: 1,
    timeUpdated: 0,
  })
  seed.close()

  const db = new DanmakuAnywhereDb()
  await db.open()
  return db
}

beforeEach(async () => {
  await Dexie.delete(DANMAKU_DB_NAME)
})

afterEach(async () => {
  await Dexie.delete(DANMAKU_DB_NAME)
})

describe('reconcileSeasonIdentity', () => {
  it('heals an orphaned season from a live config', async () => {
    const db = await seedOrphanAndUpgrade()
    const healed = await reconcileSeasonIdentity(db, [config])
    const season = (await db.season.get(1)) as Record<string, unknown>
    db.close()

    expect(healed).toBe(1)
    expect(season.manifestId).toBe('dandanplay')
    expect(season.namespaceKey).toBe(computeNamespaceKey(config))
    expect('providerConfigId' in season).toBe(false)
  })

  it('leaves the season orphaned when no config matches', async () => {
    const db = await seedOrphanAndUpgrade()
    const healed = await reconcileSeasonIdentity(db, [])
    const season = (await db.season.get(1)) as Record<string, unknown>
    db.close()

    expect(healed).toBe(0)
    expect(season.manifestId).toBeUndefined()
    expect(season.providerConfigId).toBe(CUSTOM_DDP_ID)
  })

  it('is idempotent: a second pass heals nothing', async () => {
    const db = await seedOrphanAndUpgrade()
    await reconcileSeasonIdentity(db, [config])
    const healed = await reconcileSeasonIdentity(db, [config])
    db.close()

    expect(healed).toBe(0)
  })

  it('does not heal an orphan onto an identity another row already holds', async () => {
    const db = await seedOrphanAndUpgrade()
    await db.season.add({
      manifestId: 'dandanplay',
      namespaceKey: computeNamespaceKey(config),
      indexedId: 'custom-1',
      title: 'Already Here',
      providerIds: {},
      version: 1,
      timeUpdated: 0,
      schemaVersion: 1,
    } as never)

    const healed = await reconcileSeasonIdentity(db, [config])
    const orphan = (await db.season.get(1)) as Record<string, unknown>
    db.close()

    expect(healed).toBe(0)
    expect(orphan.manifestId).toBeUndefined()
    expect(orphan.providerConfigId).toBe(CUSTOM_DDP_ID)
  })

  it('does not touch a season that already has identity', async () => {
    const db = await seedOrphanAndUpgrade()
    await db.season.update(1, {
      manifestId: 'dandanplay',
      namespaceKey: 'dandanplay',
    })
    const healed = await reconcileSeasonIdentity(db, [config])
    const season = (await db.season.get(1)) as Record<string, unknown>
    db.close()

    expect(healed).toBe(0)
    expect(season.namespaceKey).toBe('dandanplay')
  })
})
