import 'fake-indexeddb/auto'
import { fakeBrowser } from '@webext-core/fake-browser'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigStateService } from '@/background/services/Backup/ConfigStateService'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import { DANMAKU_DB_NAME, DanmakuAnywhereDb } from '@/common/db/db'
import { ExtStorageService } from '@/common/storage/ExtStorageService'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { makeProviderConfig, makeSeasonInsert } from '@/tests/factories'
import { effectiveConfigValues } from './builtin'
import { PROXY_DDP_BASE_URL } from './constant'
import { getProviderConfigError } from './ProviderConfigError'
import { ProviderConfigWriter } from './ProviderConfigWriter'
import type { ProviderConfig, ProviderConfigEdit } from './schema'
import { ProviderConfigService } from './service'

/**
 * ProviderConfigWriter over real storage and the bundled manifests. Every
 * write is checked against the manifest's configSchema, settings the
 * extension owns on a built-in are never stored, deletes take the source's
 * bookmarks with them, and concurrent operations, restore included, each see
 * the others' results, so a write that arrives after a delete never brings
 * the deleted source back.
 */

const builtinDdp = makeProviderConfig({
  id: 'dandanplay',
  manifestId: 'dandanplay',
  customName: null,
  configValues: { chConvert: 0 },
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

// Every storage read yields to the timer queue first, so two operations that
// each read then write would interleave unless the store runs them one after
// another.
function slowProviderReads() {
  const read = ExtStorageService.prototype.read
  vi.spyOn(ExtStorageService.prototype, 'read').mockImplementation(
    async function (this: ExtStorageService<unknown>) {
      await new Promise((resolve) => setTimeout(resolve, 5))
      return read.call(this)
    }
  )
}

function setup() {
  const container = createUpgradeContainer()
  return {
    container,
    writer: container.get(ProviderConfigWriter),
    readAll: () => container.get(ProviderConfigService).getAll(),
  }
}

async function errorCode(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return getProviderConfigError(error)?.code
  }
  return undefined
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

  it('refuses settings the manifest does not accept with their issues', async () => {
    await seedProviders(builtinDdp)
    const { writer, readAll } = setup()

    const error = await writer
      .create({
        manifestId: 'dandanplay',
        customName: null,
        enabled: true,
        configValues: { appId: 'only-half', chConvert: 7 },
      })
      .catch((reason: unknown) => reason)

    expect(getProviderConfigError(error)).toMatchObject({
      code: 'config.invalid',
      params: {
        issues: [{ code: 'requiredAlternatives' }, { code: 'enum' }],
      },
    })
    expect(await readAll()).toEqual([builtinDdp])
  })

  it('refuses a source whose manifest is not installed', async () => {
    await seedProviders(builtinDdp)
    const { writer, readAll } = setup()

    const code = await errorCode(
      writer.create({
        manifestId: 'not-installed',
        customName: 'Mystery',
        enabled: true,
        configValues: { anything: 1 },
      })
    )

    expect(code).toBe('config.unknownSource')
    expect(await readAll()).toEqual([builtinDdp])
  })

  it('requires a name for a source without a manifest', async () => {
    await seedProviders(builtinDdp)
    const { writer } = setup()

    const code = await errorCode(
      writer.create({
        manifestId: 'legacy:maccms',
        customName: null,
        enabled: true,
        configValues: {
          danmakuBaseUrl: 'https://vod.example/danmaku',
          danmuicuBaseUrl: 'https://vod.example/danmuicu',
        },
      })
    )

    expect(code).toBe('config.nameRequired')
  })
})

describe('ProviderConfigWriter.addBuiltin', () => {
  it('adds the built-in with its preset settings and the default name', async () => {
    await seedProviders(selfHosted)
    const { writer, readAll } = setup()

    await writer.addBuiltin('dandanplay')

    const stored = await readAll()
    expect(stored).toEqual([
      selfHosted,
      {
        id: 'dandanplay',
        manifestId: 'dandanplay',
        customName: null,
        enabled: true,
        configValues: { chConvert: 0 },
      },
    ])
    expect(effectiveConfigValues(stored[1])).toEqual({
      chConvert: 0,
      baseUrl: PROXY_DDP_BASE_URL,
    })
  })

  it('refuses a second copy of a built-in', async () => {
    await seedProviders(builtinDdp)
    const { writer } = setup()

    expect(await errorCode(writer.addBuiltin('dandanplay'))).toBe(
      'config.duplicate'
    )
  })
})

describe('ProviderConfigWriter.update', () => {
  it('changes a setting the user owns on a built-in', async () => {
    await seedProviders(builtinDdp)
    const { writer, readAll } = setup()

    await writer.update('dandanplay', { configValues: { chConvert: 1 } })

    expect((await readAll())[0].configValues).toEqual({ chConvert: 1 })
  })

  it('drops a server the edit sets on a built-in and keeps the rest', async () => {
    await seedProviders(builtinDdp)
    const { writer, readAll } = setup()

    await writer.update('dandanplay', {
      configValues: { baseUrl: 'https://elsewhere.example', chConvert: 2 },
    })

    const [stored] = await readAll()
    expect(stored.configValues).toEqual({ chConvert: 2 })
    expect(effectiveConfigValues(stored).baseUrl).toBe(PROXY_DDP_BASE_URL)
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

  it('renames a source whose manifest is not installed but keeps its settings', async () => {
    const unavailable = {
      ...selfHosted,
      manifestId: 'mine:gone',
      configValues: { anything: 1 },
    }
    await seedProviders(unavailable)
    const { writer, readAll } = setup()

    await writer.update('self-hosted', { customName: 'Still mine' })
    const code = await errorCode(
      writer.update('self-hosted', { configValues: { anything: 2 } })
    )

    expect(code).toBe('config.unknownSource')
    expect(await readAll()).toEqual([
      { ...unavailable, customName: 'Still mine' },
    ])
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

    expect(
      await errorCode(
        writer.update('self-hosted', { customName: 'Edited elsewhere' })
      )
    ).toBe('config.notFound')
    expect((await readAll()).map((config) => config.id)).toEqual([
      'dandanplay',
      'bilibili',
    ])
  })

  it('keeps every result when a delete, an edit and a toggle interleave', async () => {
    await seedProviders(builtinDdp, selfHosted, bilibili)
    const { writer, readAll } = setup()
    slowProviderReads()

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

  it('never mixes an edit into a restore that replaced the list', async () => {
    await seedProviders(builtinDdp, selfHosted)
    const { container, writer, readAll } = setup()
    const restored = { ...selfHosted, customName: 'From backup' }
    const editRead = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    const read = ExtStorageService.prototype.read
    let holding = true
    vi.spyOn(ExtStorageService.prototype, 'read').mockImplementation(
      async function (this: ExtStorageService<unknown>) {
        if (holding) {
          holding = false
          editRead.resolve()
          const data = await read.call(this)
          await release.promise
          return data
        }
        return read.call(this)
      }
    )

    const edit = writer.setEnabled('dandanplay', false)
    await editRead.promise
    const restore = container.get(ConfigStateService).restoreState({
      meta: { version: 1, timestamp: 1 },
      services: { providerConfig: { version: 6, data: [restored] } },
    })
    await Promise.race([
      restore,
      new Promise((resolve) => setTimeout(resolve, 500)),
    ])
    release.resolve()
    const [restoreResult, editResult] = await Promise.allSettled([
      restore,
      edit,
    ])

    expect(restoreResult.status).toBe('fulfilled')
    expect(editResult.status).toBe('fulfilled')
    expect(await readAll()).toEqual([restored])
  })

  it('refuses an order that was computed before a source was deleted', async () => {
    await seedProviders(builtinDdp, selfHosted, bilibili)
    const { writer, readAll } = setup()

    await writer.delete('self-hosted')

    expect(
      await errorCode(
        writer.setOrder(['bilibili', 'self-hosted', 'dandanplay'])
      )
    ).toBe('config.orderMismatch')
    expect((await readAll()).map((config) => config.id)).toEqual([
      'dandanplay',
      'bilibili',
    ])
  })
})

describe('ProviderConfigWriter deletes', () => {
  async function bookmarkSeasonOf(
    container: ReturnType<typeof setup>['container'],
    providerConfigId: string,
    indexedId: string
  ) {
    const season = await container.get(SeasonService).upsert(
      makeSeasonInsert({
        manifestId: 'dandanplay',
        providerConfigId,
        indexedId,
      })
    )
    await container.get(DanmakuAnywhereDb).bookmark.add({
      seasonId: season.id,
      episodes: [],
      lastRefreshed: 0,
      version: 1,
      timeUpdated: 0,
    })
  }

  it('removes the bookmarks of the source seasons', async () => {
    await seedProviders(builtinDdp, selfHosted)
    const { container, writer } = setup()
    await bookmarkSeasonOf(container, 'self-hosted', '1')

    await writer.delete('self-hosted')

    expect(await container.get(DanmakuAnywhereDb).bookmark.count()).toBe(0)
  })

  it('removes every config of a manifest and their bookmarks in one step', async () => {
    const second = { ...selfHosted, id: 'second', customName: 'Second' }
    await seedProviders(builtinDdp, selfHosted, second, bilibili)
    const { container, writer, readAll } = setup()
    await bookmarkSeasonOf(container, 'self-hosted', '1')
    await bookmarkSeasonOf(container, 'second', '2')

    await writer.deleteByManifest('dandanplay')

    expect(await readAll()).toEqual([bilibili])
    expect(await container.get(DanmakuAnywhereDb).bookmark.count()).toBe(0)
  })

  it('treats a manifest with no configs left as done', async () => {
    await seedProviders(bilibili)
    const { writer, readAll } = setup()

    await writer.deleteByManifest('mine:gone')

    expect(await readAll()).toEqual([bilibili])
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

describe('ProviderConfigWriter.check for restore', () => {
  it('keeps a valid config and a config whose manifest is not installed', async () => {
    const { writer } = setup()

    expect(
      await writer.check([
        selfHosted,
        { ...bilibili, id: 'gone', manifestId: 'not-installed' },
      ])
    ).toEqual([undefined, undefined])
  })

  it('refuses a config its known manifest does not accept, saying why', async () => {
    const { writer } = setup()

    const [reason] = await writer.check([
      { ...selfHosted, configValues: { chConvert: 'loud' } },
    ])

    expect(reason).toMatch(/chConvert/)
  })

  it('keeps the first valid source of an id and refuses the rest', async () => {
    const { writer } = setup()
    const first = { ...selfHosted, id: 'shared-id', customName: 'First' }
    const second = {
      ...first,
      customName: 'Second',
      configValues: { baseUrl: 'https://other.example' },
    }
    const invalidFirst = { ...first, configValues: { chConvert: 'loud' } }

    expect(await writer.check([first, second])).toEqual([
      undefined,
      expect.stringMatching(/shared-id/),
    ])
    expect(await writer.check([invalidFirst, second])).toEqual([
      expect.stringMatching(/chConvert/),
      undefined,
    ])
  })
})
