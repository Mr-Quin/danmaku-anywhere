import { LEGACY_MACCMS_ID } from '@danmaku-anywhere/danmaku-converter'
import { ManifestRunner, zManifest } from '@mr-quin/dango'
import { describe, expect, it, vi } from 'vitest'
import { backgroundContainerModule } from '@/background/ioc'
import { LoggerSymbol } from '@/common/Logger'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import {
  LEGACY_MACCMS_CAPABILITIES,
  NO_CAPABILITIES,
} from '@/common/providers/sourceCapabilities'
import { createTestContainer } from '@/tests/createTestContainer'
import { silentLogger } from '@/tests/silentLogger'
import { ManifestRegistry } from './ManifestRegistry'
import { SourceCapabilityService } from './SourceCapabilityService'

/**
 * Capabilities come from the installed manifest through the real provider
 * factory: which configs automatic matching may pick, which source reads a
 * pasted URL, and the capability error a gated operation raises.
 */

const pipeline = {
  steps: [{ type: 'assign', id: 'noop', values: { x: '1' } }],
  output: '[]',
}

type Pipeline = 'search' | 'episodes' | 'danmaku' | 'season' | 'parseUrl'

function makeRunner(
  id: string,
  pipelines: Pipeline[],
  urlMatch: { host: string; path: string }[] = []
): ManifestRunner {
  const manifest = zManifest.parse({
    apiVersion: 1,
    id,
    name: id,
    version: '1.0.0',
    hosts: ['example.com'],
    urlMatch,
    ...Object.fromEntries(pipelines.map((name) => [name, pipeline])),
  })
  return new ManifestRunner(manifest)
}

const FULL: Pipeline[] = ['search', 'episodes', 'danmaku']

function makeConfig(
  manifestId: string,
  overrides: Partial<ProviderConfig> = {}
): ProviderConfig {
  return {
    id: `${manifestId}-config`,
    manifestId,
    name: `${manifestId} source`,
    enabled: true,
    configValues: {},
    ...overrides,
  }
}

function build(configs: ProviderConfig[], runners: ManifestRunner[]) {
  const byId = new Map(runners.map((runner) => [runner.id, runner]))
  const getRunner = vi.fn((manifestId: string) => {
    const runner = byId.get(manifestId)
    if (!runner) {
      throw new Error(`no manifest registered with id: ${manifestId}`)
    }
    return runner
  })
  const providerConfigService = {
    getAll: vi.fn(async () => configs),
    get: vi.fn(async (id: string) => configs.find((c) => c.id === id)),
  }
  return createTestContainer(
    [backgroundContainerModule],
    [
      {
        identifier: ManifestRegistry,
        value: { ready: Promise.resolve(), getRunner },
      },
      { identifier: ProviderConfigService, value: providerConfigService },
      { identifier: LoggerSymbol, value: silentLogger },
    ]
  ).get(SourceCapabilityService)
}

describe('SourceCapabilityService.getAutomaticProviders', () => {
  it('never picks a search-only manifest for automatic matching', async () => {
    const searchOnly = makeConfig('search-only')
    const full = makeConfig('full')
    const service = build(
      [searchOnly, full],
      [makeRunner('search-only', ['search']), makeRunner('full', FULL)]
    )

    expect(await service.getAutomaticProviders()).toEqual([full])
    expect(await service.getFirstAutomaticProvider()).toEqual(full)
  })

  it('returns nothing when every enabled source is search-only', async () => {
    const service = build(
      [makeConfig('search-only')],
      [makeRunner('search-only', ['search'])]
    )

    expect(await service.getFirstAutomaticProvider()).toBeUndefined()
  })

  it('skips disabled configs and legacy MacCMS, keeping config order', async () => {
    const first = makeConfig('b')
    const second = makeConfig('a')
    const service = build(
      [
        makeConfig(LEGACY_MACCMS_ID),
        makeConfig('off', { enabled: false }),
        first,
        second,
      ],
      [makeRunner('off', FULL), makeRunner('a', FULL), makeRunner('b', FULL)]
    )

    expect(await service.getAutomaticProviders()).toEqual([first, second])
  })
})

describe('SourceCapabilityService.forProviderConfig', () => {
  it('answers from the installed manifest', async () => {
    const service = build(
      [makeConfig('bili')],
      [makeRunner('bili', [...FULL, 'season'])]
    )

    expect(await service.forProviderConfig('bili-config')).toEqual({
      sourceRemoved: false,
      capabilities: {
        search: true,
        episodes: true,
        danmaku: true,
        seasonRefresh: true,
        parseUrl: false,
        automaticMatch: true,
      },
    })
  })

  it('gives legacy MacCMS its fixed set', async () => {
    const service = build([makeConfig(LEGACY_MACCMS_ID)], [])

    expect(
      await service.forProviderConfig(`${LEGACY_MACCMS_ID}-config`)
    ).toEqual({
      sourceRemoved: false,
      capabilities: LEGACY_MACCMS_CAPABILITIES,
    })
  })

  it('reports a deleted config as removed with no capabilities', async () => {
    const service = build([], [])

    expect(await service.forProviderConfig('gone')).toEqual({
      sourceRemoved: true,
      capabilities: NO_CAPABILITIES,
    })
  })
})

describe('SourceCapabilityService.providerFor', () => {
  it('refuses episodes for a source without an episodes pipeline', async () => {
    const config = makeConfig('search-only')
    const service = build([config], [makeRunner('search-only', ['search'])])

    await expect(service.providerFor(config, 'episodes')).rejects.toMatchObject(
      {
        name: 'SourceError',
        problem: 'episodesUnsupported',
        sourceName: 'search-only source',
      }
    )
  })

  it('refuses danmaku for a source without a danmaku pipeline', async () => {
    const config = makeConfig('no-danmaku')
    const service = build(
      [config],
      [makeRunner('no-danmaku', ['search', 'episodes'])]
    )

    await expect(service.providerFor(config, 'danmaku')).rejects.toMatchObject({
      name: 'SourceError',
      problem: 'refetchUnsupported',
    })
  })

  it('hands back the provider when the source can do it', async () => {
    const config = makeConfig('full')
    const service = build([config], [makeRunner('full', FULL)])

    const provider = await service.providerFor(config, 'danmaku')

    expect(await provider.getCapabilities()).toMatchObject({ danmaku: true })
  })
})

describe('SourceCapabilityService.findUrlParsers', () => {
  const bangumi = { host: 'www.bilibili.com', path: '^/bangumi/play/ss\\d+' }

  it('finds the installed source whose manifest parses the URL', async () => {
    const bili = makeConfig('bili')
    const service = build(
      [makeConfig('other'), bili],
      [
        makeRunner('other', FULL),
        makeRunner('bili', [...FULL, 'parseUrl'], [bangumi]),
      ]
    )

    expect(
      await service.findUrlParsers('https://www.bilibili.com/bangumi/play/ss1')
    ).toEqual([bili])
  })

  it('reads a URL pasted without a scheme', async () => {
    const bili = makeConfig('bili')
    const service = build([bili], [makeRunner('bili', ['parseUrl'], [bangumi])])

    expect(
      await service.findUrlParsers('www.bilibili.com/bangumi/play/ss1')
    ).toEqual([bili])
  })

  it('ignores a manifest that matches the URL but has no parseUrl pipeline', async () => {
    const service = build(
      [makeConfig('bili')],
      [makeRunner('bili', FULL, [bangumi])]
    )

    expect(
      await service.findUrlParsers('https://www.bilibili.com/bangumi/play/ss1')
    ).toEqual([])
  })

  it('finds nothing once the parsing source is uninstalled', async () => {
    const service = build([], [makeRunner('bili', ['parseUrl'], [bangumi])])

    expect(
      await service.findUrlParsers('https://www.bilibili.com/bangumi/play/ss1')
    ).toEqual([])
  })

  it('finds nothing for text that is not a URL', async () => {
    const service = build(
      [makeConfig('bili')],
      [makeRunner('bili', ['parseUrl'], [bangumi])]
    )

    expect(await service.findUrlParsers('frieren')).toEqual([])
  })
})

describe('SourceCapabilityService.findUrlSource', () => {
  const cover = { host: 'v.qq.com', path: '^/x/cover/' }

  it('names the source that will parse the URL', async () => {
    const service = build(
      [makeConfig('tencent', { name: 'Tencent Video' })],
      [makeRunner('tencent', ['parseUrl'], [cover])]
    )

    expect(
      await service.findUrlSource('https://v.qq.com/x/cover/abc/def.html')
    ).toEqual({ sourceName: 'Tencent Video' })
  })

  it('answers null when no installed source parses the URL', async () => {
    const service = build([], [])

    expect(
      await service.findUrlSource('https://v.qq.com/x/cover/abc/def.html')
    ).toBeNull()
  })
})
