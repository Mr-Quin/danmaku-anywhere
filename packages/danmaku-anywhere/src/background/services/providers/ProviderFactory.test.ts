import {
  DanmakuSourceType,
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ILogger } from '@/common/Logger'
import { LoggerSymbol } from '@/common/Logger'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import {
  MANIFEST_RUN_OPTIONS,
  ManifestProviderService,
} from './ManifestProviderService'
import type { ManifestRegistry } from './ManifestRegistry'

/**
 * ProviderFactory dispatches on `config.manifestId` and constructs either
 * a ManifestProviderService configured for the source, or the legacy
 * MacCmsProviderService for `legacy:maccms` configs. Any non-maccms
 * manifestId (built-in or catalog) resolves to a ManifestProviderService
 * whose provider tag is derived from the manifestId. Custom DanDanPlay servers
 * share the `dandanplay` manifest and thread their baseUrl/auth through
 * configValues; there is no DDP-compat special case.
 */

const RUN_OPTS = MANIFEST_RUN_OPTIONS

const mockRunner = {
  runSearch: vi.fn(async () => []),
  runEpisodes: vi.fn(async () => []),
  runDanmaku: vi.fn(async () => []),
  configDefaults: vi.fn(() => ({})),
}

const fakeRegistry = {
  ready: Promise.resolve(),
  getRunner: vi.fn(() => mockRunner),
} as unknown as ManifestRegistry

vi.mock('./MacCmsProviderService', () => ({
  MacCmsProviderService: class FakeMacCmsProvider {
    readonly forProvider = DanmakuSourceType.MacCMS
    readonly tag = 'maccms-legacy'
    constructor(_config: unknown, _logger: unknown) {}
  },
}))

const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  sub: () => silentLogger,
} as unknown as ILogger

function fakeContext(logger: ILogger = silentLogger) {
  return {
    get: (token: unknown) => (token === LoggerSymbol ? logger : fakeRegistry),
  } as unknown as Parameters<
    typeof import('./ProviderFactory').danmakuProviderFactory
  >[0]
}

beforeEach(() => {
  mockRunner.runSearch.mockClear()
  mockRunner.runEpisodes.mockClear()
  mockRunner.runDanmaku.mockClear()
})

async function buildFactory() {
  const { danmakuProviderFactory } = await import('./ProviderFactory')
  return danmakuProviderFactory(fakeContext())
}

function customDdp(opts: {
  baseUrl?: string
  auth?: { enabled?: boolean; headers?: { key: string; value: string }[] }
}): ProviderConfig {
  return {
    id: 'custom-1',
    manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
    name: 'Custom DDP',
    enabled: true,
    configValues: opts,
  }
}

describe('ProviderFactory dispatch', () => {
  it('routes built-in DanDanPlay to the dandanplay manifest', async () => {
    const factory = await buildFactory()
    const service = factory({
      id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
      manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
      name: 'DanDanPlay',
      enabled: true,
      configValues: {},
    })

    expect(service.forProvider).toBe(DanmakuSourceType.DanDanPlay)
    await service.search({ keyword: 'x' })
    expect(mockRunner.runSearch).toHaveBeenCalledWith({ q: 'x' }, RUN_OPTS)
  })

  it('routes Bilibili and threads danmakuFormat from configValues', async () => {
    const factory = await buildFactory()
    const service = factory({
      id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
      manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
      name: 'Bilibili',
      enabled: true,
      configValues: { danmakuFormat: 'protobuf' },
    })

    expect(service.forProvider).toBe(DanmakuSourceType.Bilibili)
    await service.search({ keyword: 'frieren' })
    expect(mockRunner.runSearch).toHaveBeenCalledWith(
      {
        q: 'frieren',
        danmakuFormat: 'protobuf',
      },
      RUN_OPTS
    )
  })

  it('routes Tencent without extraInputs', async () => {
    const factory = await buildFactory()
    const service = factory({
      id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
      manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
      name: 'Tencent',
      enabled: true,
      configValues: {},
    })

    expect(service.forProvider).toBe(DanmakuSourceType.Tencent)
    await service.search({ keyword: 'x' })
    expect(mockRunner.runSearch).toHaveBeenCalledWith({ q: 'x' }, RUN_OPTS)
  })

  it('routes a custom DanDanPlay server through the dandanplay manifest with configValues threaded through', async () => {
    const factory = await buildFactory()
    const service = factory(
      customDdp({
        baseUrl: 'https://my-ddp.example',
        auth: { enabled: true, headers: [{ key: 'X-A', value: '1' }] },
      })
    )

    expect(service.forProvider).toBe(DanmakuSourceType.DanDanPlay)
    await service.search({ keyword: 'x' })
    expect(mockRunner.runSearch).toHaveBeenCalledWith(
      {
        q: 'x',
        baseUrl: 'https://my-ddp.example',
        auth: { enabled: true, headers: [{ key: 'X-A', value: '1' }] },
      },
      RUN_OPTS
    )
  })

  it('routes legacy MacCMS to MacCmsProviderService (not ManifestProviderService)', async () => {
    const factory = await buildFactory()
    const service = factory({
      id: LEGACY_MACCMS_ID,
      manifestId: LEGACY_MACCMS_ID,
      name: 'MacCMS',
      enabled: true,
      configValues: {},
    })

    expect(service.forProvider).toBe(DanmakuSourceType.MacCMS)
    expect((service as unknown as { tag?: string }).tag).toBe('maccms-legacy')
  })

  it('resolves a non-built-in catalog manifestId to ManifestProviderService with the tag derived from the manifestId', async () => {
    const factory = await buildFactory()
    const service = factory({
      id: 'iqiyi-1',
      manifestId: 'iqiyi',
      name: 'iQIYI',
      enabled: true,
      configValues: { region: 'cn' },
    })

    expect(service).toBeInstanceOf(ManifestProviderService)
    expect(service.forProvider).toBe(DanmakuSourceType.DanDanPlay)
    await service.search({ keyword: 'x' })
    expect(mockRunner.runSearch).toHaveBeenCalledWith(
      { q: 'x', region: 'cn' },
      RUN_OPTS
    )
  })
})
