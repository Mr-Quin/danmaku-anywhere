import { LEGACY_MACCMS_ID } from '@danmaku-anywhere/danmaku-converter'
import { ManifestRunner, zManifest } from '@mr-quin/dango'
import { describe, expect, it, vi } from 'vitest'
import { backgroundContainerModule } from '@/background/ioc'
import { LoggerSymbol } from '@/common/Logger'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import {
  LEGACY_MACCMS_CAPABILITIES,
  MANIFEST_MISSING,
} from '@/common/providers/sourceCapabilities'
import { createTestContainer } from '@/tests/createTestContainer'
import { silentLogger } from '@/tests/silentLogger'
import { ManifestRegistry } from './ManifestRegistry'
import { SourceCapabilityService } from './SourceCapabilityService'

/**
 * Capabilities come from the installed manifest through the real provider
 * factory: which configs search matching and mapping resolution may use,
 * which source reads a pasted link, and the source error a gated operation
 * raises. A config whose manifest is not registered is unavailable, and never
 * takes the other sources down with it.
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
  const findRunner = vi.fn(async (manifestId: string) => {
    return byId.get(manifestId)
  })
  const getRunner = vi.fn(async (manifestId: string) => {
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
        value: { findRunner, getRunner },
      },
      { identifier: ProviderConfigService, value: providerConfigService },
      { identifier: LoggerSymbol, value: silentLogger },
    ]
  ).get(SourceCapabilityService)
}

const BANGUMI = { host: 'www.bilibili.com', path: '^/bangumi/play/ss\\d+' }
const BANGUMI_URL = 'https://www.bilibili.com/bangumi/play/ss1'

describe('SourceCapabilityService search matching', () => {
  it('never picks a search-only manifest', async () => {
    const searchOnly = makeConfig('search-only')
    const full = makeConfig('full')
    const service = build(
      [searchOnly, full],
      [makeRunner('search-only', ['search']), makeRunner('full', FULL)]
    )

    expect(await service.getSearchMatchProviders()).toEqual([full])
    expect(await service.getFirstSearchMatchProvider()).toEqual(full)
  })

  it('finds nothing when every enabled source is search-only', async () => {
    const service = build(
      [makeConfig('search-only')],
      [makeRunner('search-only', ['search'])]
    )

    expect(await service.getFirstSearchMatchProvider()).toBeUndefined()
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

    expect(await service.getSearchMatchProviders()).toEqual([first, second])
  })
})

describe('SourceCapabilityService mapping resolution', () => {
  it('resolves through a source that has episodes and danmaku but no search', async () => {
    const noSearch = makeConfig('no-search')
    const service = build(
      [noSearch],
      [makeRunner('no-search', ['episodes', 'danmaku'])]
    )

    expect(await service.getMappingProviders()).toEqual([noSearch])
    expect(await service.getSearchMatchProviders()).toEqual([])
  })

  it('needs both episodes and danmaku', async () => {
    const service = build(
      [makeConfig('episodes-only')],
      [makeRunner('episodes-only', ['search', 'episodes'])]
    )

    expect(await service.getMappingProviders()).toEqual([])
  })
})

describe('SourceCapabilityService with a config whose manifest is missing', () => {
  const broken = makeConfig('gone', { name: 'Gone' })
  const full = makeConfig('full')
  const bili = makeConfig('bili')
  const runners = () => [
    makeRunner('full', FULL),
    makeRunner('bili', ['parseUrl'], [BANGUMI]),
  ]

  it('answers unavailable with the reason instead of rejecting', async () => {
    const service = build([broken], runners())

    expect(await service.forProviderConfig(broken.id)).toEqual({
      status: 'unavailable',
      reason: MANIFEST_MISSING,
    })
  })

  it('still matches through the other sources', async () => {
    const service = build([broken, full], runners())

    expect(await service.getSearchMatchProviders()).toEqual([full])
    expect(await service.getMappingProviders()).toEqual([full])
  })

  it('still finds the source that parses a link', async () => {
    const service = build([broken, bili], runners())

    expect(await service.findUrlSource(BANGUMI_URL)).toEqual({
      kind: 'parseable',
      sourceName: bili.name,
    })
  })

  it('refuses an operation on the broken source as unavailable', async () => {
    const service = build([broken], runners())

    await expect(
      service.sourceProvider(broken, 'danmaku')
    ).rejects.toMatchObject({
      name: 'SourceError',
      problem: 'sourceUnavailable',
      sourceName: 'Gone',
    })
  })
})

describe('SourceCapabilityService.forProviderConfig', () => {
  it('answers from the installed manifest', async () => {
    const service = build(
      [makeConfig('bili')],
      [makeRunner('bili', [...FULL, 'season'])]
    )

    expect(await service.forProviderConfig('bili-config')).toEqual({
      status: 'available',
      capabilities: {
        search: true,
        episodes: true,
        danmaku: true,
        seasonRefresh: true,
        parseUrl: false,
      },
    })
  })

  it('gives legacy MacCMS its fixed set', async () => {
    const service = build([makeConfig(LEGACY_MACCMS_ID)], [])

    expect(
      await service.forProviderConfig(`${LEGACY_MACCMS_ID}-config`)
    ).toEqual({ status: 'available', capabilities: LEGACY_MACCMS_CAPABILITIES })
  })

  it('reports a deleted config as removed', async () => {
    const service = build([], [])

    expect(await service.forProviderConfig('gone')).toEqual({
      status: 'removed',
    })
  })
})

describe('SourceCapabilityService gates', () => {
  it.each([
    ['episodes', ['search'], 'episodesUnsupported'],
    ['danmaku', ['search', 'episodes'], 'danmakuUnsupported'],
    ['seasonRefresh', FULL, 'seasonRefreshUnsupported'],
  ] as const)('refuses %s for a manifest without that pipeline', async (operation, pipelines, problem) => {
    const config = makeConfig('partial')
    const service = build([config], [makeRunner('partial', [...pipelines])])

    await expect(
      service.sourceProvider(config, operation)
    ).rejects.toMatchObject({
      name: 'SourceError',
      problem,
      sourceName: config.name,
    })
  })

  it('refuses source operations on legacy MacCMS', async () => {
    const config = makeConfig(LEGACY_MACCMS_ID)
    const service = build([config], [])

    await expect(
      service.sourceProvider(config, 'episodes')
    ).rejects.toMatchObject({
      problem: 'episodesUnsupported',
    })
  })

  it('refuses search for a manifest without a search pipeline', async () => {
    const config = makeConfig('lookup-only')
    const service = build(
      [config],
      [makeRunner('lookup-only', ['episodes', 'danmaku'])]
    )

    await expect(service.searchProvider(config)).rejects.toMatchObject({
      name: 'SourceError',
      problem: 'searchUnsupported',
    })
  })

  it('hands back a source provider when the source can do it', async () => {
    const config = makeConfig('full')
    const service = build([config], [makeRunner('full', FULL)])

    const provider = await service.sourceProvider(config, 'danmaku')

    expect(provider.kind).toBe('source')
  })
})

describe('SourceCapabilityService.findUrlSource', () => {
  it('names the installed source whose manifest parses the link', async () => {
    const service = build(
      [makeConfig('other'), makeConfig('bili', { name: 'Bilibili' })],
      [
        makeRunner('other', FULL),
        makeRunner('bili', [...FULL, 'parseUrl'], [BANGUMI]),
      ]
    )

    expect(await service.findUrlSource(BANGUMI_URL)).toEqual({
      kind: 'parseable',
      sourceName: 'Bilibili',
    })
  })

  it('reads a link pasted without a scheme', async () => {
    const service = build(
      [makeConfig('bili')],
      [makeRunner('bili', ['parseUrl'], [BANGUMI])]
    )

    expect(
      await service.findUrlSource('www.bilibili.com/bangumi/play/ss1')
    ).toMatchObject({ kind: 'parseable' })
  })

  it('ignores a manifest that matches the link but has no parseUrl pipeline', async () => {
    const service = build(
      [makeConfig('bili')],
      [makeRunner('bili', FULL, [BANGUMI])]
    )

    expect(await service.findUrlSource(BANGUMI_URL)).toEqual({
      kind: 'unclaimed',
    })
  })

  it('leaves a link unclaimed once the parsing source is uninstalled', async () => {
    const service = build([], [makeRunner('bili', ['parseUrl'], [BANGUMI])])

    expect(await service.findUrlSource(BANGUMI_URL)).toEqual({
      kind: 'unclaimed',
    })
  })

  it('leaves a link on a path no manifest claims unclaimed', async () => {
    const service = build(
      [makeConfig('bili')],
      [makeRunner('bili', ['parseUrl'], [BANGUMI])]
    )

    expect(
      await service.findUrlSource('https://www.bilibili.com/bangumi/media/md1')
    ).toEqual({ kind: 'unclaimed' })
  })

  it('leaves an unclaimed link pasted without a scheme unclaimed', async () => {
    const service = build(
      [makeConfig('bili')],
      [makeRunner('bili', ['parseUrl'], [BANGUMI])]
    )

    expect(
      await service.findUrlSource('www.bilibili.com/bangumi/media/md1')
    ).toEqual({ kind: 'unclaimed' })
  })

  it('skips a source whose URL check throws and still finds the next', async () => {
    const flaky = makeRunner('flaky', ['parseUrl'], [BANGUMI])
    vi.spyOn(flaky, 'canParse').mockImplementation(() => {
      throw new Error('runner went away')
    })
    const service = build(
      [makeConfig('flaky'), makeConfig('bili', { name: 'Bilibili' })],
      [flaky, makeRunner('bili', ['parseUrl'], [BANGUMI])]
    )

    expect(await service.findUrlSource(BANGUMI_URL)).toEqual({
      kind: 'parseable',
      sourceName: 'Bilibili',
    })
  })

  it('treats a plain title as not a link', async () => {
    const service = build(
      [makeConfig('bili')],
      [makeRunner('bili', ['parseUrl'], [BANGUMI])]
    )

    expect(await service.findUrlSource('frieren')).toEqual({ kind: 'notLink' })
    expect(await service.findUrlSource('Dr.STONE')).toEqual({ kind: 'notLink' })
  })
})
