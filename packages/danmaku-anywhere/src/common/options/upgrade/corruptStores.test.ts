import { fakeBrowser } from '@webext-core/fake-browser'
import { beforeEach, describe, expect, it } from 'vitest'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { MountConfigService } from '@/common/options/mountConfig/service'
import { BUILTIN_SOURCES } from '@/common/options/providerConfig/builtin'
import { ProviderConfigWriter } from '@/common/options/providerConfig/ProviderConfigWriter'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { readV150Backup } from '@/tests/v150Backup'
import { OptionsUpgradeService } from './OptionsUpgradeService'
import { UPGRADE_RUN_KEY } from './upgradeRun'

/**
 * The real option stores, seeded from the v1.5.0 backup with one store
 * corrupted the way release testing found them, go through the real upgrade.
 * A corrupt store fails the upgrade as a migration failure and is kept byte
 * for byte instead of being reset or losing entries. Resetting it keeps the
 * corrupt data, custom sources included, in the recovery copy and lets the
 * upgrade finish, and a reset providerConfig is empty and unseeded, so the
 * writer's seeding gives it the built-ins again. A split store whose chunks
 * do not add up is kept as its raw items.
 */

const SYNC_STORES = [
  'extensionOptions',
  'danmakuOptions',
  'mountConfig',
  'providerConfig',
  'aiProviderConfig',
]

async function seedV150(overrides: Record<string, unknown>) {
  const backup = readV150Backup() as { services: Record<string, unknown> }
  for (const name of SYNC_STORES) {
    await fakeBrowser.storage.sync.set({
      [name]: overrides[name] ?? backup.services[name],
    })
  }
}

async function readSync(key: string) {
  return (await fakeBrowser.storage.sync.get(key))[key]
}

async function readLocal(key: string) {
  return (await fakeBrowser.storage.local.get(key))[key]
}

const corruptCases = [
  {
    store: 'providerConfig',
    stored: { data: { a: 1 }, version: 1 },
  },
  {
    store: 'mountConfig',
    stored: { data: 'x', version: 5 },
  },
  {
    store: 'extensionOptions',
    stored: { data: { lang: 'en' }, version: 'abc' },
  },
]

describe('upgrading v1.5.0 stores with one of them corrupt', () => {
  let upgrader: OptionsUpgradeService

  beforeEach(() => {
    upgrader = createUpgradeContainer({ ready: false }).get(
      OptionsUpgradeService
    )
  })

  it.each(
    corruptCases
  )('fails on $store as a migration failure and keeps it as stored', async ({
    store,
    stored,
  }) => {
    await seedV150({ [store]: stored })

    await expect(upgrader.upgrade()).rejects.toThrow(store)

    expect(await readSync(store)).toEqual(stored)
    expect(await readLocal(UPGRADE_RUN_KEY)).toMatchObject({
      status: 'failed',
      stores: [{ store, problem: 'options.migration' }],
    })
  })

  it('keeps custom sources in the recovery copy when the user resets providerConfig', async () => {
    const backup = readV150Backup() as {
      services: { providerConfig: { data: unknown[]; version: number } }
    }
    const corrupt = {
      version: 1,
      data: { sources: backup.services.providerConfig.data },
    }
    await seedV150({ providerConfig: corrupt })
    await expect(upgrader.upgrade()).rejects.toThrow()

    const copy = await upgrader.saveRecoveryCopy('providerConfig')
    await upgrader.resetStore('providerConfig', copy.id)

    expect(copy.envelope).toEqual(corrupt)
    expect(JSON.stringify(copy)).toContain('https://ddp.selfhosted.example')
    const container = createUpgradeContainer()
    expect(await container.get(ProviderConfigService).options.get()).toEqual([])
    expect(await container.get(ProviderConfigService).hasSeeded()).toBe(false)
    expect(await readLocal(UPGRADE_RUN_KEY)).toBeUndefined()
    expect(await container.get(MountConfigService).options.getVersion()).toBe(6)

    expect(await container.get(ProviderConfigWriter).seedBuiltins()).toBe(true)
    expect(
      (await container.get(ProviderConfigService).getAll()).map((c) => c.id)
    ).toEqual(BUILTIN_SOURCES.map((source) => source.manifestId))
  })

  it('keeps the raw items of a split store that does not add up', async () => {
    const filters = Array.from({ length: 400 }, (_, index) => {
      return { type: 'text' as const, value: `剧透 ${index}`, enabled: true }
    })
    await createUpgradeContainer().get(OptionsUpgradeService).upgrade()
    await createUpgradeContainer()
      .get(DanmakuOptionsService)
      .options.update({ filters })
    await fakeBrowser.storage.sync.set({ 'danmakuOptions.filters.1': 'torn' })

    const copy = await upgrader.saveRecoveryCopy('danmakuOptions')

    expect(copy.envelope).toBeUndefined()
    expect(copy.items).toMatchObject({
      danmakuOptions: expect.objectContaining({ parts: expect.any(Object) }),
      'danmakuOptions.filters.0': expect.any(String),
      'danmakuOptions.filters.1': 'torn',
    })
  })
})
