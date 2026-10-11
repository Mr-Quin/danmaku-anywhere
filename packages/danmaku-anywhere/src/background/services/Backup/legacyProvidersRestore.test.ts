import { fakeBrowser } from '@webext-core/fake-browser'
import { describe, expect, it, vi } from 'vitest'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { PROXY_DDP_BASE_URL } from '@/common/options/providerConfig/constant'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import { makeProviderConfig } from '@/tests/factories'
import { readV150Store } from '@/tests/v150Backup'
import { ConfigStateService } from './ConfigStateService'

/**
 * Restores a backup whose extensionOptions predates providerConfig (version 20
 * with danmakuSources) through the real ConfigStateService. The providers
 * derived from danmakuSources are written only when the extensionOptions
 * payload is accepted, and they are in storage when the restore resolves. A
 * providerConfig entry in the same backup wins over the derived providers.
 */

const current = [makeProviderConfig({ id: 'keep-me', name: 'Keep' })]

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
    name: 'DanDanPlay',
    enabled: true,
    configValues: { baseUrl: PROXY_DDP_BASE_URL, chConvert: 0 },
  },
  {
    id: 'bilibili',
    manifestId: 'bilibili',
    name: 'Bilibili',
    enabled: true,
    configValues: { danmakuFormat: 'xml' },
  },
  {
    id: 'tencent',
    manifestId: 'tencent',
    name: 'Tencent',
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

async function restore(services: Record<string, unknown>) {
  await fakeBrowser.storage.sync.set({
    providerConfig: { version: 5, data: current },
  })
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
      version: 5,
      data: derivedProviders,
    })
    expect((await readStored('extensionOptions'))?.data).not.toHaveProperty(
      'danmakuSources'
    )
  })

  it('keeps the providerConfig entry of the same backup over the derived providers', async () => {
    const own = [makeProviderConfig({ id: 'from-backup', name: 'Backup' })]

    const result = await restore({
      extensionOptions: legacyExtensionOptions(),
      providerConfig: { version: 5, data: own },
    })

    expect(result.success).toBe(true)
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
})
