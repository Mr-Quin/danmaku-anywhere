import type { CustomEpisode } from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it, vi } from 'vitest'
import { backgroundContainerModule } from '@/background/ioc'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import { TitleMappingService } from '@/background/services/persistence/TitleMappingService'
import type { MatchEpisodeInput } from '@/common/anime/dto'
import { LoggerSymbol } from '@/common/Logger'
import { defaultExtensionOptions } from '@/common/options/extensionOptions/constant'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import type { NamingRule } from '@/common/options/localMatchingRule/schema'
import { NamingRuleService } from '@/common/options/localMatchingRule/service'
import { SeasonMap } from '@/common/seasonMap/SeasonMap'
import {
  createTestContainer,
  type TestContainerOverride,
} from '@/tests/createTestContainer'
import { silentLogger } from '@/tests/silentLogger'
import { LocalMatchingStrategy } from './LocalMatchingStrategy'

/**
 * Local matching runs three lookups in a fixed order: a naming rule keyed by
 * the media title, then a naming rule reached through the stored folder
 * mapping, then a fuzzy filename match. Each test pins which of the three
 * produced the returned episode, since they are indistinguishable from the
 * result shape alone.
 */

const customEpisode = {
  id: 7,
  title: '/Show/S01E01.mkv',
} as unknown as CustomEpisode // lint-specs-allow-cast: CustomEpisode carries comment payloads the lookups never read

function makeInput(overrides: Partial<MatchEpisodeInput> = {}) {
  return {
    mapKey: 'Show',
    title: 'Show',
    episodeNumber: 1,
    ...overrides,
  }
}

function makeRule(overrides: Partial<NamingRule> = {}): NamingRule {
  return {
    folderPath: '/Show',
    title: 'Show',
    pattern: 'S01E{episode:2d}.mkv',
    ...overrides,
  }
}

function buildStrategy(doubles: {
  matchLocalDanmaku?: boolean
  rules?: NamingRule[]
  getCustomByTitle?: DanmakuService['getCustomByTitle']
  matchLocalByTitle?: DanmakuService['matchLocalByTitle']
  mapping?: SeasonMap
}) {
  const {
    matchLocalDanmaku = true,
    rules = [],
    getCustomByTitle = vi.fn<DanmakuService['getCustomByTitle']>(
      async () => undefined
    ),
    matchLocalByTitle = vi.fn<DanmakuService['matchLocalByTitle']>(
      async () => undefined
    ),
    mapping,
  } = doubles

  const overrides: TestContainerOverride<unknown>[] = [
    { identifier: LoggerSymbol, value: silentLogger },
    {
      identifier: ExtensionOptionsService,
      value: {
        get: async () => {
          return { ...defaultExtensionOptions, matchLocalDanmaku }
        },
      } satisfies Pick<ExtensionOptionsService, 'get'>,
    },
    {
      identifier: NamingRuleService,
      value: {
        get: async () => {
          return { rules }
        },
      } satisfies Pick<NamingRuleService, 'get'>,
    },
    {
      identifier: DanmakuService,
      value: { getCustomByTitle, matchLocalByTitle } satisfies Pick<
        DanmakuService,
        'getCustomByTitle' | 'matchLocalByTitle'
      >,
    },
    {
      identifier: TitleMappingService,
      value: {
        get: vi.fn<TitleMappingService['get']>(async () => mapping),
      } satisfies Pick<TitleMappingService, 'get'>,
    },
  ]

  return createTestContainer([backgroundContainerModule], overrides).get(
    LocalMatchingStrategy
  )
}

describe('LocalMatchingStrategy', () => {
  it('passes to the next strategy when local matching is disabled', async () => {
    const strategy = buildStrategy({
      matchLocalDanmaku: false,
      matchLocalByTitle: vi.fn(async () => customEpisode),
    })

    await expect(strategy.match(makeInput())).resolves.toBeNull()
  })

  it('renders the rule matched by title into a full path', async () => {
    const getCustomByTitle = vi.fn<DanmakuService['getCustomByTitle']>(
      async () => customEpisode
    )
    const strategy = buildStrategy({ rules: [makeRule()], getCustomByTitle })

    const result = await strategy.match(makeInput({ episodeNumber: 3 }))

    expect(getCustomByTitle).toHaveBeenCalledWith('/Show/S01E03.mkv')
    expect(result).toEqual({
      status: 'success',
      data: customEpisode,
      metadata: { strategy: 'local' },
    })
  })

  it('matches a rule on originalTitle when the display title has none', async () => {
    const getCustomByTitle = vi.fn<DanmakuService['getCustomByTitle']>(
      async () => customEpisode
    )
    const strategy = buildStrategy({
      rules: [makeRule({ title: 'Original Show' })],
      getCustomByTitle,
    })

    const result = await strategy.match(
      makeInput({ originalTitle: 'Original Show' })
    )

    expect(result?.status).toBe('success')
  })

  it('prefers the title rule over the mapped folder rule when both match', async () => {
    const getCustomByTitle = vi.fn<DanmakuService['getCustomByTitle']>(
      async () => customEpisode
    )
    const strategy = buildStrategy({
      rules: [
        makeRule({ folderPath: '/ByTitle' }),
        makeRule({ title: 'unused', folderPath: '/ByMapping' }),
      ],
      getCustomByTitle,
      mapping: SeasonMap.fromSnapshot({
        key: 'Show',
        seasons: {},
        seasonIds: [],
        local: '/ByMapping',
      }),
    })

    await strategy.match(makeInput())

    expect(getCustomByTitle).toHaveBeenCalledExactlyOnceWith(
      '/ByTitle/S01E01.mkv'
    )
  })

  it('reaches a rule through the mapped folder when no title rule matches', async () => {
    const getCustomByTitle = vi.fn<DanmakuService['getCustomByTitle']>(
      async () => customEpisode
    )
    const strategy = buildStrategy({
      rules: [makeRule({ title: 'Some other show' })],
      getCustomByTitle,
      mapping: SeasonMap.fromSnapshot({
        key: 'Show',
        seasons: {},
        seasonIds: [],
        local: '/Show',
      }),
    })

    const result = await strategy.match(makeInput({ episodeNumber: 12 }))

    expect(getCustomByTitle).toHaveBeenCalledWith('/Show/S01E12.mkv')
    expect(result?.status).toBe('success')
  })

  it('falls back to a fuzzy filename match on originalTitle', async () => {
    const matchLocalByTitle = vi.fn<DanmakuService['matchLocalByTitle']>(
      async () => customEpisode
    )
    const strategy = buildStrategy({ matchLocalByTitle })

    const result = await strategy.match(
      makeInput({ originalTitle: 'S01E01.mkv' })
    )

    expect(matchLocalByTitle).toHaveBeenCalledWith('S01E01.mkv')
    expect(result).toEqual({
      status: 'success',
      data: customEpisode,
      metadata: { strategy: 'local' },
    })
  })

  it('passes to the next strategy when no rule and no filename matches', async () => {
    const strategy = buildStrategy({ rules: [makeRule()] })

    await expect(strategy.match(makeInput())).resolves.toBeNull()
  })

  it('skips rule matching entirely without an episode number', async () => {
    const getCustomByTitle = vi.fn<DanmakuService['getCustomByTitle']>(
      async () => customEpisode
    )
    const strategy = buildStrategy({ rules: [makeRule()], getCustomByTitle })

    const result = await strategy.match(makeInput({ episodeNumber: undefined }))

    expect(getCustomByTitle).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })
})
