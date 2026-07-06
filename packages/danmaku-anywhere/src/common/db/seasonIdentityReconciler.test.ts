import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { computeNamespaceKey } from '@/common/providers/namespaceKey'
import { DANMAKU_DB_NAME, DanmakuAnywhereDb } from './db'
import { reconcileSeasonIdentity } from './seasonIdentityReconciler'

/**
 * Drives the real v15 migration to produce an orphaned self-hosted season (one
 * that keeps its providerConfigId), then exercises the runtime reconciler that
 * heals it back to a manifestId + namespaceKey from a live provider config,
 * and rekeys seasonMap entries the migration kept under their old config id.
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
  identityFields: ['baseUrl'],
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
    expect(season.namespaceKey).toBe(
      computeNamespaceKey(config, config.identityFields)
    )
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
      namespaceKey: computeNamespaceKey(config, config.identityFields),
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

  it('rekeys a seasonMap entry kept under the old config id', async () => {
    const db = await seedOrphanAndUpgrade()
    await db.seasonMap.add({
      key: 'tt-1',
      seasons: { [CUSTOM_DDP_ID]: 1, bilibili: 3 },
      seasonIds: [1, 3],
    })

    await reconcileSeasonIdentity(db, [config])
    const entry = await db.seasonMap.get('tt-1')
    db.close()

    expect(entry?.seasons).toEqual({
      [computeNamespaceKey(config, config.identityFields)]: 1,
      bilibili: 3,
    })
    expect(entry?.seasonIds.sort()).toEqual([1, 3])
  })

  it('keeps an unmatched seasonMap key and never clobbers an existing namespace mapping', async () => {
    const db = await seedOrphanAndUpgrade()
    const namespaceKey = computeNamespaceKey(config, config.identityFields)
    await db.seasonMap.add({
      key: 'tt-1',
      seasons: { [CUSTOM_DDP_ID]: 1, [namespaceKey]: 9, 'other-uuid': 5 },
      seasonIds: [1, 9, 5],
    })

    await reconcileSeasonIdentity(db, [config])
    const entry = await db.seasonMap.get('tt-1')
    db.close()

    // The uuid whose namespace mapping already exists is dropped (the newer
    // mapping wins); a uuid with no live config stays for the next run.
    expect(entry?.seasons).toEqual({ [namespaceKey]: 9, 'other-uuid': 5 })
    expect(entry?.seasonIds.sort()).toEqual([5, 9])
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
