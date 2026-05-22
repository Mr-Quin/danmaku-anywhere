import {
  DanmakuSourceType,
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ILogger } from '@/common/Logger'
import { LoggerSymbol } from '@/common/Logger'
import { DDP_COMPAT_MANIFEST_ID } from '@/common/options/providerConfig/constant'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import type { ManifestRegistry } from './ManifestRegistry'

/**
 * ProviderFactory dispatches on `config.manifestId` and constructs either
 * a ManifestProviderService configured for the source, or the legacy
 * MacCmsProviderService for `legacy:maccms` configs. Covers the
 * DDP-Compat fallback (empty baseUrl → proxy-backed dandanplay manifest)
 * and verifies the right manifest id is threaded to the runner.
 */

const mockRunner = {
  runSearch: vi.fn(async () => []),
  runEpisodes: vi.fn(async () => []),
  runDanmaku: vi.fn(async () => []),
  configDefaults: vi.fn(() => ({})),
}

const fakeRegistry = {
  getRunner: () => mockRunner,
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

function ddpCompat(opts: {
  baseUrl?: string
  auth?: { enabled?: boolean; headers?: { key: string; value: string }[] }
}): ProviderConfig {
  return {
    id: 'compat-1',
    manifestId: DDP_COMPAT_MANIFEST_ID,
    impl: DanmakuSourceType.DanDanPlay,
    name: 'Compat',
    enabled: true,
    isBuiltIn: false,
    configValues: opts,
  }
}

describe('ProviderFactory dispatch', () => {
  it('routes built-in DanDanPlay to the dandanplay manifest', async () => {
    const factory = await buildFactory()
    const service = factory({
      id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
      manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
      impl: DanmakuSourceType.DanDanPlay,
      name: 'DanDanPlay',
      enabled: true,
      isBuiltIn: true,
      configValues: {},
    })

    expect(service.forProvider).toBe(DanmakuSourceType.DanDanPlay)
    await service.search({ keyword: 'x' })
    expect(mockRunner.runSearch).toHaveBeenCalledWith({ q: 'x' })
  })

  it('routes Bilibili and threads danmakuFormat from configValues', async () => {
    const factory = await buildFactory()
    const service = factory({
      id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
      manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
      impl: DanmakuSourceType.Bilibili,
      name: 'Bilibili',
      enabled: true,
      isBuiltIn: true,
      configValues: { danmakuFormat: 'protobuf' },
    })

    expect(service.forProvider).toBe(DanmakuSourceType.Bilibili)
    await service.search({ keyword: 'frieren' })
    expect(mockRunner.runSearch).toHaveBeenCalledWith({
      q: 'frieren',
      danmakuFormat: 'protobuf',
    })
  })

  it('routes Tencent without extraInputs', async () => {
    const factory = await buildFactory()
    const service = factory({
      id: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
      manifestId: PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
      impl: DanmakuSourceType.Tencent,
      name: 'Tencent',
      enabled: true,
      isBuiltIn: true,
      configValues: {},
    })

    expect(service.forProvider).toBe(DanmakuSourceType.Tencent)
    await service.search({ keyword: 'x' })
    expect(mockRunner.runSearch).toHaveBeenCalledWith({ q: 'x' })
  })

  it('routes DDP-Compat with baseUrl to ddp-compat manifest with configValues threaded through', async () => {
    const factory = await buildFactory()
    const service = factory(
      ddpCompat({
        baseUrl: 'https://my-ddp.example',
        auth: { enabled: true, headers: [{ key: 'X-A', value: '1' }] },
      })
    )

    expect(service.forProvider).toBe(DanmakuSourceType.DanDanPlay)
    await service.search({ keyword: 'x' })
    expect(mockRunner.runSearch).toHaveBeenCalledWith({
      q: 'x',
      baseUrl: 'https://my-ddp.example',
      auth: { enabled: true, headers: [{ key: 'X-A', value: '1' }] },
    })
  })

  it('falls back DDP-Compat without baseUrl to the proxy-backed dandanplay manifest', async () => {
    const factory = await buildFactory()
    const service = factory(ddpCompat({ baseUrl: '' }))

    expect(service.forProvider).toBe(DanmakuSourceType.DanDanPlay)
    await service.search({ keyword: 'x' })
    // configValues still threads through; the DDP manifest ignores the
    // baseUrl/auth keys it doesn't declare as inputs.
    expect(mockRunner.runSearch).toHaveBeenCalledWith({ q: 'x', baseUrl: '' })
  })

  it('logs a warning when DDP-Compat falls back with auth headers configured', async () => {
    const warn = vi.fn()
    const noisyLogger = {
      debug: () => {},
      info: () => {},
      warn,
      error: () => {},
      sub: () => noisyLogger,
    } as unknown as ILogger
    const factory = (await import('./ProviderFactory')).danmakuProviderFactory(
      fakeContext(noisyLogger)
    )
    const service = factory(
      ddpCompat({
        baseUrl: '',
        auth: { enabled: true, headers: [{ key: 'X-Token', value: 'secret' }] },
      })
    )

    await service.search({ keyword: 'x' })
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/authHeaders.*baseUrl|authHeaders ignored/i)
    )
  })

  it('routes legacy MacCMS to MacCmsProviderService (not ManifestProviderService)', async () => {
    const factory = await buildFactory()
    const service = factory({
      id: LEGACY_MACCMS_ID,
      manifestId: LEGACY_MACCMS_ID,
      impl: DanmakuSourceType.MacCMS,
      name: 'MacCMS',
      enabled: true,
      isBuiltIn: false,
      configValues: {},
    })

    expect(service.forProvider).toBe(DanmakuSourceType.MacCMS)
    expect((service as unknown as { tag?: string }).tag).toBe('maccms-legacy')
  })

  it('throws on an unknown manifestId', async () => {
    const factory = await buildFactory()
    expect(() =>
      factory({
        id: 'x',
        manifestId: 'builtin:nonexistent',
        impl: DanmakuSourceType.DanDanPlay,
        name: 'X',
        enabled: true,
        isBuiltIn: false,
        configValues: {},
      })
    ).toThrow(/Unknown manifestId/)
  })
})
