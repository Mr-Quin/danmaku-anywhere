import 'fake-indexeddb/auto'
import { fakeBrowser } from '@webext-core/fake-browser'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import { DANMAKU_DB_NAME, DanmakuAnywhereDb } from '@/common/db/db'
import { PROXY_DDP_BASE_URL } from '@/common/options/providerConfig/constant'
import type {
  ProviderConfig,
  ProviderConfigEdit,
} from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { makeProviderConfig, makeSeasonInsert } from '@/tests/factories'
import { ProviderConfigWriter } from './ProviderConfigWriter'

/**
 * ProviderConfigWriter over real storage and the bundled manifests. Every
 * write is checked against the manifest's configSchema, a built-in's locked
 * settings cannot be edited, deletes take the source's bookmarks with them,
 * and concurrent operations each see the others' results, so a write that
 * arrives after a delete never brings the deleted source back.
 */

const builtinDdp = makeProviderConfig({
  id: 'dandanplay',
  manifestId: 'dandanplay',
  customName: null,
  configValues: { baseUrl: PROXY_DDP_BASE_URL, chConvert: 0 },
})

const selfHosted = makeProviderConfig({
  id: 'self-hosted',
  manifestId: 'dandanplay',
  customName: 'Home server',
  configValues: { baseUrl: 'https://ddp.home.example' },
})

const bilibili = makeProviderConfig({
  id: 'bilibili',
  manifestId: 'bilibili',
  customName: null,
  configValues: { danmakuFormat: 'xml' },
})

async function seedProviders(...configs: ProviderConfig[]) {
  await fakeBrowser.storage.sync.set({
    providerConfig: { version: 6, data: configs },
  })
}

function setup() {
  const container = createUpgradeContainer()
  return {
    container,
    writer: container.get(ProviderConfigWriter),
    readAll: () => container.get(ProviderConfigService).getAll(),
  }
}

beforeEach(async () => {
  await Dexie.delete(DANMAKU_DB_NAME)
})

afterEach(async () => {
  await Dexie.delete(DANMAKU_DB_NAME)
})

describe('ProviderConfigWriter.create', () => {
  it('stores the draft under a new id', async () => {
    await seedProviders(builtinDdp)
    const { writer, readAll } = setup()

    const created = await writer.create({
      manifestId: 'dandanplay',
      customName: null,
      enabled: true,
      configValues: { baseUrl: 'https://ddp.example' },
    })

    expect(created.id).not.toBe('dandanplay')
    expect(await readAll()).toEqual([builtinDdp, created])
  })

  it('rejects settings the manifest does not accept and writes nothing', async () => {
    await seedProviders(builtinDdp)
    const { writer, readAll } = setup()

    await expect(
      writer.create({
        manifestId: 'dandanplay',
        customName: null,
        enabled: true,
        configValues: { appId: 'only-half', chConvert: 7 },
      })
    ).rejects.toThrow(/Invalid source settings/)
    expect(await readAll()).toEqual([builtinDdp])
  })

  it('rejects a source whose manifest is not installed', async () => {
    await seedProviders(builtinDdp)
    const { writer } = setup()

    await expect(
      writer.create({
        manifestId: 'not-installed',
        customName: 'Mystery',
        enabled: true,
        configValues: {},
      })
    ).rejects.toThrow(/not-installed/)
  })

  it('requires a name for a source without a manifest', async () => {
    await seedProviders(builtinDdp)
    const { writer } = setup()

    await expect(
      writer.create({
        manifestId: 'legacy:maccms',
        customName: null,
        enabled: true,
        configValues: {
          danmakuBaseUrl: 'https://vod.example/danmaku',
          danmuicuBaseUrl: 'https://vod.example/danmuicu',
        },
      })
    ).rejects.toThrow(/name is required/)
  })
})

describe('ProviderConfigWriter.addBuiltin', () => {
  it('adds the built-in with its preset settings and the default name', async () => {
    await seedProviders(selfHosted)
    const { writer, readAll } = setup()

    await writer.addBuiltin('dandanplay')

    expect(await readAll()).toEqual([
      selfHosted,
      {
        id: 'dandanplay',
        manifestId: 'dandanplay',
        customName: null,
        enabled: true,
        configValues: { baseUrl: PROXY_DDP_BASE_URL, chConvert: 0 },
      },
    ])
  })

  it('refuses a second copy of a built-in', async () => {
    await seedProviders(builtinDdp)
    const { writer } = setup()

    await expect(writer.addBuiltin('dandanplay')).rejects.toThrow(
      /already exists/
    )
  })
})

describe('ProviderConfigWriter.update', () => {
  it('changes an unlocked setting of a built-in', async () => {
    await seedProviders(builtinDdp)
    const { writer, readAll } = setup()

    await writer.update('dandanplay', {
      configValues: { ...builtinDdp.configValues, chConvert: 1 },
    })

    expect((await readAll())[0].configValues.chConvert).toBe(1)
  })

  it('refuses to point a built-in at another server', async () => {
    await seedProviders(builtinDdp)
    const { writer, readAll } = setup()

    await expect(
      writer.update('dandanplay', {
        configValues: { baseUrl: 'https://elsewhere.example', chConvert: 0 },
      })
    ).rejects.toThrow(/baseUrl cannot be changed/)
    expect(await readAll()).toEqual([builtinDdp])
  })

  it('lets a custom source change its server', async () => {
    await seedProviders(selfHosted)
    const { writer, readAll } = setup()

    await writer.update('self-hosted', {
      configValues: { baseUrl: 'https://ddp.new.example' },
    })

    expect((await readAll())[0].configValues.baseUrl).toBe(
      'https://ddp.new.example'
    )
  })

  it('renames a source and resets it to the default name', async () => {
    await seedProviders(selfHosted)
    const { writer, readAll } = setup()

    await writer.update('self-hosted', { customName: 'Renamed' })
    expect((await readAll())[0].customName).toBe('Renamed')

    await writer.update('self-hosted', { customName: null })
    expect((await readAll())[0].customName).toBeNull()
  })

  it('renames a source whose stored settings no longer validate', async () => {
    const broken = { ...selfHosted, configValues: {} }
    await seedProviders(broken)
    const { writer, readAll } = setup()

    await writer.update('self-hosted', { customName: 'Still here' })

    expect((await readAll())[0].customName).toBe('Still here')
  })

  it('does not accept a change to the id', async () => {
    await seedProviders(selfHosted)
    const { writer } = setup()

    const edit: ProviderConfigEdit & { id: string } = { id: 'other' }

    await expect(writer.update('self-hosted', edit)).rejects.toThrow()
  })
})

describe('ProviderConfigWriter ordering of concurrent writes', () => {
  it('does not bring back a source deleted before a stale edit lands', async () => {
    await seedProviders(builtinDdp, selfHosted, bilibili)
    const { writer, readAll } = setup()

    await writer.delete('self-hosted')

    await expect(
      writer.update('self-hosted', { customName: 'Edited elsewhere' })
    ).rejects.toThrow(/not found/)
    expect((await readAll()).map((config) => config.id)).toEqual([
      'dandanplay',
      'bilibili',
    ])
  })

  it('keeps both results when a delete and an edit of another source race', async () => {
    await seedProviders(builtinDdp, selfHosted, bilibili)
    const { writer, readAll } = setup()

    await Promise.all([
      writer.update('bilibili', {
        configValues: { danmakuFormat: 'protobuf' },
      }),
      writer.delete('self-hosted'),
      writer.setEnabled('dandanplay', false),
    ])

    expect(await readAll()).toEqual([
      { ...builtinDdp, enabled: false },
      { ...bilibili, configValues: { danmakuFormat: 'protobuf' } },
    ])
  })

  it('rejects an order that was computed before a source was deleted', async () => {
    await seedProviders(builtinDdp, selfHosted, bilibili)
    const { writer, readAll } = setup()

    await writer.delete('self-hosted')

    await expect(
      writer.setOrder(['bilibili', 'self-hosted', 'dandanplay'])
    ).rejects.toThrow(/every source exactly once/)
    expect((await readAll()).map((config) => config.id)).toEqual([
      'dandanplay',
      'bilibili',
    ])
  })
})

describe('ProviderConfigWriter.delete', () => {
  it('removes the bookmarks of the source seasons', async () => {
    await seedProviders(builtinDdp, selfHosted)
    const { container, writer } = setup()
    const db = container.get(DanmakuAnywhereDb)
    const season = await container.get(SeasonService).upsert(
      makeSeasonInsert({
        manifestId: 'dandanplay',
        providerConfigId: 'self-hosted',
      })
    )
    await db.bookmark.add({
      seasonId: season.id,
      episodes: [],
      lastRefreshed: 0,
      version: 1,
      timeUpdated: 0,
    })

    await writer.delete('self-hosted')

    expect(await db.bookmark.count()).toBe(0)
  })
})

describe('ProviderConfigWriter.seedBuiltins', () => {
  it('writes the built-ins with default names into an empty list', async () => {
    await seedProviders()
    const { writer, readAll } = setup()

    expect(await writer.seedBuiltins()).toBe(true)
    expect(
      (await readAll()).map((config) => [config.id, config.customName])
    ).toEqual([
      ['dandanplay', null],
      ['bilibili', null],
      ['tencent', null],
    ])
  })

  it('leaves a list that already has sources alone', async () => {
    await seedProviders(selfHosted)
    const { writer, readAll } = setup()

    expect(await writer.seedBuiltins()).toBe(false)
    expect(await readAll()).toEqual([selfHosted])
  })
})

describe('ProviderConfigWriter.backupItemSchema', () => {
  it('accepts a valid config and rejects one its manifest does not accept', async () => {
    const { writer } = setup()

    const valid = await writer.backupItemSchema.safeParseAsync(selfHosted)
    const invalid = await writer.backupItemSchema.safeParseAsync({
      ...selfHosted,
      configValues: { chConvert: 'loud' },
    })
    const unknown = await writer.backupItemSchema.safeParseAsync({
      ...selfHosted,
      manifestId: 'not-installed',
    })

    expect(valid.success).toBe(true)
    expect(invalid.success).toBe(false)
    expect(unknown.success).toBe(false)
  })
})
