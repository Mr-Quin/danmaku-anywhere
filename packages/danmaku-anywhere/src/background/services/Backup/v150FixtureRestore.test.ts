import { fakeBrowser } from '@webext-core/fake-browser'
import type { Container } from 'inversify'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type IStoreService,
  StoreServiceSymbol,
} from '@/common/options/IStoreService'
import { PROXY_DDP_BASE_URL } from '@/common/options/providerConfig/constant'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { OptionsUpgradeService } from '@/common/options/upgrade/OptionsUpgradeService'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import {
  readV150Backup,
  readV150Store,
  seedV150Store,
} from '@/tests/v150Backup'
import { ConfigStateService } from './ConfigStateService'

/**
 * Restores the v1.5.0 backup fixture (the e2e migration backup) through the
 * real ConfigStateService and reads every store back. Asserts that restoring
 * the file and upgrading the same data at startup end with identical store
 * contents, and that exporting the restored state and restoring that export
 * again changes nothing.
 */

const FIXTURE_STORES = [
  'extensionOptions',
  'danmakuOptions',
  'mountConfig',
  'providerConfig',
  'aiProviderConfig',
  'integrationPolicy',
] as const

async function readStores(container: Container) {
  const services = container.getAll<IStoreService>(StoreServiceSymbol)
  const contents: Record<string, unknown> = {}
  for (const name of FIXTURE_STORES) {
    const service = services.find((s) => s.name === name)
    contents[name] = await service?.options.get()
  }
  return contents
}

async function upgradeAtStartup() {
  for (const name of FIXTURE_STORES) {
    await seedV150Store(name)
  }
  const container = createUpgradeContainer({ ready: false })
  await container.get(OptionsUpgradeService).upgrade()
  return readStores(container)
}

async function restoreFile() {
  const container = createUpgradeContainer()
  const configState = container.get(ConfigStateService)
  const result = await configState.restoreState(readV150Backup())
  return { container, configState, result }
}

describe('restoring the v1.5.0 backup fixture', () => {
  beforeEach(() => {
    vi.spyOn(fakeBrowser.runtime, 'getManifest').mockReturnValue({
      manifest_version: 3,
      name: 'Test extension',
      version: '1.6.0',
    })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  it('restores every fixture store without dropping an entry', async () => {
    const { result } = await restoreFile()

    expect(result.details).toEqual(
      Object.fromEntries(
        FIXTURE_STORES.map((name) => {
          return [name, { success: true, droppedEntries: 0 }]
        })
      )
    )
  })

  it.each(
    FIXTURE_STORES
  )('leaves %s with the same contents as the startup upgrade', async (name) => {
    const { container } = await restoreFile()
    const restored = await readStores(container)

    fakeBrowser.reset()
    const upgraded = await upgradeAtStartup()

    expect(restored[name]).toEqual(upgraded[name])
  })

  it('stores each restored store at its latest version', async () => {
    const { container } = await restoreFile()
    const services = container.getAll<IStoreService>(StoreServiceSymbol)

    for (const name of FIXTURE_STORES) {
      const service = services.find((s) => s.name === name)
      expect(await service?.options.getVersion()).toBe(
        service?.options.latestVersion
      )
    }
  })

  it('restores the provider list with bare ids, manifests and the stripped base url', async () => {
    const { container } = await restoreFile()
    const providers = (await readStores(container))
      .providerConfig as ProviderConfig[]

    expect(providers.map((c) => [c.id, c.manifestId, c.enabled])).toEqual([
      ['d9d068cc-d7a5-4277-990b-73b28f7637f8', 'dandanplay', true],
      ['bilibili', 'bilibili', true],
      ['dandanplay', 'dandanplay', true],
      ['21999133-1b22-4e15-a48b-a8c6677cd902', 'legacy:maccms', true],
      ['tencent', 'tencent', false],
      ['e15d5979-e823-4ce8-a2ab-513dc358dae1', 'dandanplay', true],
    ])
    expect(providers[0].configValues.baseUrl).toBe(
      'https://ddp.selfhosted.example'
    )
    expect(providers[2].configValues).toEqual({
      baseUrl: PROXY_DDP_BASE_URL,
      chConvert: 0,
    })
  })

  it('restores the user values of the extension and danmaku options', async () => {
    const { container } = await restoreFile()
    const stores = await readStores(container)
    const extensionFixture =
      readV150Store<Record<string, unknown>>('extensionOptions').data
    const danmakuFixture =
      readV150Store<Record<string, unknown>>('danmakuOptions').data

    expect(stores.extensionOptions).toMatchObject({
      lang: 'en',
      theme: { colorMode: 'dark' },
      retentionPolicy: { enabled: true, deleteCommentsAfter: 14 },
      playerOptions: { showSkipButton: false },
      hotkeys: { refreshComments: { enabled: true, key: 'alt+r' } },
      id: extensionFixture.id,
    })
    expect(stores.danmakuOptions).toMatchObject({
      speed: danmakuFixture.speed,
      style: danmakuFixture.style,
      filters: danmakuFixture.filters,
    })
    expect(stores.danmakuOptions).not.toHaveProperty('dedup')
  })

  it('exports a state that restores to the same contents when restored again', async () => {
    const { container, configState } = await restoreFile()
    const firstExport = await configState.getState()
    const firstContents = await readStores(container)

    const secondRestore = await configState.restoreState(
      JSON.parse(JSON.stringify(firstExport))
    )
    const secondExport = await configState.getState()

    FIXTURE_STORES.forEach((name) => {
      expect(secondRestore.details[name]).toEqual({
        success: true,
        droppedEntries: 0,
      })
    })
    FIXTURE_STORES.forEach((name) => {
      expect(secondExport.services[name]).toEqual(firstExport.services[name])
    })
    expect(await readStores(container)).toEqual(firstContents)
  })
})
