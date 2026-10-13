import { fakeBrowser } from '@webext-core/fake-browser'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { PROXY_DDP_BASE_URL } from '@/common/options/providerConfig/constant'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { makeProviderConfig } from '@/tests/factories'
import {
  failNextProviderWrite,
  holdProviderWrites,
  isSettledAfterMicrotasks,
} from '@/tests/providerConfigWrites'
import { readV150Store } from '@/tests/v150Backup'
import { ConfigStateService } from './ConfigStateService'

const current = [makeProviderConfig({ id: 'keep-me', customName: 'Keep' })]

const danmakuSources = {
  dandanplay: {
    enabled: true,
    baseUrl: '',
    useCustomRoot: false,
    chConvert: 0,
  },
  bilibili: { enabled: true, danmakuTypePreference: 'xml' },
  tencent: { enabled: false },
}

const derivedProviders: ProviderConfig[] = [
  {
    id: 'dandanplay',
    manifestId: 'dandanplay',
    customName: null,
    enabled: true,
    configValues: { baseUrl: PROXY_DDP_BASE_URL, chConvert: 0 },
  },
  {
    id: 'bilibili',
    manifestId: 'bilibili',
    customName: null,
    enabled: true,
    configValues: { danmakuFormat: 'xml' },
  },
  {
    id: 'tencent',
    manifestId: 'tencent',
    customName: null,
    enabled: false,
    configValues: {},
  },
]

function legacyExtensionOptions(overrides: Record<string, unknown> = {}) {
  const fixture = readV150Store<Record<string, unknown>>('extensionOptions')
  return {
    version: 20,
    data: { ...fixture.data, danmakuSources, ...overrides },
  }
}

function restore(services: Record<string, unknown>) {
  const container = createUpgradeContainer()
  return container.get(ConfigStateService).restoreState({
    meta: { version: 1, timestamp: 12345 },
    services,
  })
}

async function readStored(name: string) {
  const entry = await fakeBrowser.storage.sync.get(name)
  return entry[name] as { version: number; data: unknown } | undefined
}

describe('restoring a backup with pre-providerConfig extensionOptions', () => {
  beforeEach(async () => {
    await fakeBrowser.storage.sync.set({
      providerConfig: { version: 6, data: current },
    })
  })

  it('leaves the providers untouched when the extensionOptions payload is rejected', async () => {
    const result = await restore({
      extensionOptions: legacyExtensionOptions({ lang: 123 }),
    })

    expect(result.details.extensionOptions.success).toBe(false)
    expect((await readStored('providerConfig'))?.data).toEqual(current)
  })

  it('has the derived providers stored at the current version when the restore resolves', async () => {
    const result = await restore({
      extensionOptions: legacyExtensionOptions(),
    })

    expect(result.details.extensionOptions).toEqual({
      success: true,
      droppedEntries: 0,
    })
    expect(await readStored('providerConfig')).toEqual({
      version: 6,
      data: derivedProviders,
    })
    expect((await readStored('extensionOptions'))?.data).not.toHaveProperty(
      'danmakuSources'
    )
  })

  it('does not resolve until the derived providers are written', async () => {
    const release = holdProviderWrites()

    const pending = restore({ extensionOptions: legacyExtensionOptions() })

    expect(await isSettledAfterMicrotasks(pending)).toBe(false)
    release()
    expect((await pending).details.extensionOptions.success).toBe(true)
    expect((await readStored('providerConfig'))?.data).toEqual(derivedProviders)
  })

  it('keeps the providerConfig entry of the same backup without writing the derived providers', async () => {
    const own = [
      makeProviderConfig({
        id: 'from-backup',
        customName: 'Backup',
        configValues: { baseUrl: 'https://ddp.backup.example' },
      }),
    ]
    const setUnblocked = vi.spyOn(OptionsService.prototype, 'setUnblocked')

    const result = await restore({
      extensionOptions: legacyExtensionOptions(),
      providerConfig: { version: 6, data: own },
    })

    expect(result.success).toBe(true)
    expect(setUnblocked).not.toHaveBeenCalled()
    expect((await readStored('providerConfig'))?.data).toEqual(own)
  })

  it('reports extensionOptions as failed and leaves it unwritten when the provider write fails', async () => {
    vi.spyOn(OptionsService.prototype, 'setUnblocked').mockRejectedValueOnce(
      new Error('QUOTA_BYTES quota exceeded')
    )

    const result = await restore({
      extensionOptions: legacyExtensionOptions(),
    })

    expect(result.details.extensionOptions).toEqual({
      success: false,
      error: 'QUOTA_BYTES quota exceeded',
    })
    expect(await readStored('extensionOptions')).toBeUndefined()
    expect((await readStored('providerConfig'))?.data).toEqual(current)
  })

  it('reports extensionOptions as failed when storage rejects the provider write', async () => {
    failNextProviderWrite(new Error('QUOTA_BYTES quota exceeded'))

    const result = await restore({
      extensionOptions: legacyExtensionOptions(),
    })

    expect(result.details.extensionOptions).toEqual({
      success: false,
      error: 'QUOTA_BYTES quota exceeded',
    })
    expect(await readStored('extensionOptions')).toBeUndefined()
    expect((await readStored('providerConfig'))?.data).toEqual(current)
  })
})
