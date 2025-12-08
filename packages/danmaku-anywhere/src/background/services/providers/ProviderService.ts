import type {
  ByProvider,
  CustomSeason,
  Episode,
  EpisodeMeta,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import { TitleMappingService } from '@/background/services/persistence/TitleMappingService'
import type {
  MatchEpisodeInput,
  MatchEpisodeResult,
  SeasonQueryFilter,
  SeasonSearchRequest,
} from '@/common/anime/dto'
import type { DanmakuFetchRequest } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import {
  assertProviderType,
  isNotCustom,
  isProvider,
} from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import {
  type ExtensionOptionsService,
  extensionOptionsServiceSymbol,
} from '@/common/options/extensionOptions/service'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { stripExtension } from '@/common/utils/stripExtension'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import type { IDanmakuProvider, OmitSeasonId } from './IDanmakuProvider'
import {
  DanmakuProviderFactory,
  type IDanmakuProviderFactory,
} from './ProviderFactory'

const enrichEpisode = <T extends DanmakuSourceType>(
  episode: OmitSeasonId<ByProvider<EpisodeMeta, T>>,
  season: ByProvider<Season, T>
) => {
  return {
    ...episode,
    seasonId: season.id,
    season: season,
  }
}

@injectable('Singleton')
export class ProviderService {
  private logger: typeof Logger
  private parsers: IDanmakuProvider[] = []

  constructor(
    @inject(TitleMappingService)
    private titleMappingService: TitleMappingService,
    @inject(DanmakuService)
    private danmakuService: DanmakuService,
    @inject(SeasonService) private seasonService: SeasonService,
    @inject(ProviderConfigService)
    private providerConfigService: ProviderConfigService,
    @inject(extensionOptionsServiceSymbol)
    private extensionOptionsService: ExtensionOptionsService,
    @inject(DanmakuProviderFactory)
    private danmakuProviderFactory: IDanmakuProviderFactory
  ) {
    invariant(
      isServiceWorker(),
      'ProviderService is only available in service worker'
    )
    this.logger = Logger.sub('[ProviderService]')
  }

  private async initParsers() {
    try {
      const bilibiliConfig =
        await this.providerConfigService.getBuiltInBilibili()
      const tencentConfig = await this.providerConfigService.getBuiltInTencent()

      this.parsers = [
        this.danmakuProviderFactory(bilibiliConfig),
        this.danmakuProviderFactory(tencentConfig),
      ]
    } catch (e) {
      this.logger.error('Failed to init parsers', e)
    }
  }

  async searchSeason(
    params: SeasonSearchRequest
  ): Promise<Season[] | CustomSeason[]> {
    const providerConfig = await this.providerConfigService.mustGet(
      params.providerConfigId
    )

    const service = this.danmakuProviderFactory(providerConfig)

    const seasonInserts = await service.search(params)
    // TODO: fix this once we fold custom seasons into the season insert
    if (
      seasonInserts[0] &&
      isProvider(seasonInserts[0], DanmakuSourceType.MacCMS)
    ) {
      return seasonInserts as CustomSeason[]
    }
    return this.seasonService.bulkUpsert(seasonInserts as SeasonInsert[])
  }

  async fetchEpisodesBySeason(
    seasonId: number
  ): Promise<WithSeason<EpisodeMeta>[]> {
    const season = await this.seasonService.mustGetById(seasonId)

    const providerConfig = await this.providerConfigService.mustGet(
      season.providerConfigId
    )
    const service = this.danmakuProviderFactory.getTyped(providerConfig)

    const enrichEpisodes = <T extends DanmakuSourceType>(
      episodes: OmitSeasonId<ByProvider<EpisodeMeta, T>>[],
      season: ByProvider<Season, T>
    ) => {
      return episodes.map((episode) => enrichEpisode(episode, season))
    }

    switch (service.forProvider) {
      case DanmakuSourceType.DanDanPlay: {
        assertProviderType(season, DanmakuSourceType.DanDanPlay)
        const episodes = await service.getEpisodes(season.providerIds)
        return enrichEpisodes(episodes, season)
      }
      case DanmakuSourceType.Bilibili: {
        assertProviderType(season, DanmakuSourceType.Bilibili)
        const episodes = await service.getEpisodes(season.providerIds)
        return enrichEpisodes(episodes, season)
      }
      case DanmakuSourceType.Tencent: {
        assertProviderType(season, DanmakuSourceType.Tencent)
        const episodes = await service.getEpisodes(season.providerIds)
        return enrichEpisodes(episodes, season)
      }
      case DanmakuSourceType.MacCMS: {
        throw new Error('MacCMS does not support fetching episodes')
      }
    }
  }

  async refreshSeason(filter: SeasonQueryFilter) {
    const [season] = await this.seasonService.filter(filter)

    const providerConfig = await this.providerConfigService.mustGet(
      season.providerConfigId
    )

    const service = this.danmakuProviderFactory(providerConfig)
    if (service?.getSeason) {
      const seasonInsert = await service.getSeason(season.providerIds)
      if (seasonInsert) {
        await this.seasonService.upsert(seasonInsert)
      } else {
        throw new Error(`Season refresh failed: ${season.title}`, {
          cause: season,
        })
      }
    }
  }

  async preloadNextEpisode(request: DanmakuFetchRequest): Promise<void> {
    const config = await this.resolveConfig(request)

    const service = this.danmakuProviderFactory(config)

    if (service?.preloadNextEpisode) {
      return service.preloadNextEpisode(request)
    }

    this.logger.warn(
      `Preloading next episode is not supported for provider: ${config.impl}`
    )
  }

  private async resolveConfig(
    request: DanmakuFetchRequest
  ): Promise<ProviderConfig> {
    return this.providerConfigService.mustGet(
      request.meta.season.providerConfigId
    )
  }

  async getDanmaku(request: DanmakuFetchRequest): Promise<WithSeason<Episode>> {
    const { options = {} } = request
    const provider = request.meta.provider

    let existingDanmaku: WithSeason<Episode> | undefined

    const { meta } = request
    const [found] = await this.danmakuService.filter({
      provider,
      indexedId: meta.indexedId,
      seasonId: meta.seasonId,
    })
    existingDanmaku = found

    if (existingDanmaku && !options.forceUpdate) {
      this.logger.debug('Danmaku found in db', existingDanmaku)
      return existingDanmaku
    }

    if (options.forceUpdate) {
      this.logger.debug('Force update flag set, bypassed cache')
    } else {
      this.logger.debug('Danmaku not found in db, fetching from server')
    }

    const config = await this.resolveConfig(request)
    const service = this.danmakuProviderFactory(config)

    const comments = await service.getDanmaku(request)

    const { season, ...rest } = meta

    const saved = await this.danmakuService.upsert({
      ...rest,
      seasonId: season.id,
      comments,
      commentCount: comments.length,
    })

    return {
      ...saved,
      season,
    } as WithSeason<Episode>
  }

  /**
   * Finds an episode in a given season using the appropriate provider service.
   */
  private async findEpisodeInSeason(
    season: Season,
    episodeNumber: number
  ): Promise<WithSeason<EpisodeMeta>> {
    const providerConfig = await this.providerConfigService.mustGet(
      season.providerConfigId
    )

    const service = this.danmakuProviderFactory(providerConfig)

    if (service.findEpisode) {
      const match = await service.findEpisode(season, episodeNumber)
      if (match) return match
      throw new Error(
        `Episode ${episodeNumber} not found in season: ${season.title}`
      )
    }

    throw new Error(
      `Provider ${season.provider} does not support episode matching.`
    )
  }

  /**
   * Attempts to find a custom (local) episode by title.
   */
  private async findLocalCustomEpisode(
    title: string
  ): Promise<WithSeason<EpisodeMeta> | null> {
    const options = await this.extensionOptionsService.get()
    if (!options.matchLocalDanmaku) {
      return null
    }

    return this.danmakuService.matchLocalByTitle(stripExtension(title))
  }

  /**
   * Attempts to find a season using existing mapping or provided seasonId.
   */
  private async findSeasonFromMappingOrId(
    mapKey: string,
    seasonId: number | undefined,
    automaticProviderId: string
  ): Promise<Season | null> {
    // If seasonId is provided directly, use it
    if (seasonId) {
      this.logger.debug('Using provided season id')
      const season = await this.seasonService.getById(seasonId)
      if (season) {
        // Save the mapping for future use
        await this.titleMappingService.add(
          SeasonMap.fromSeason(mapKey, season)
        )
        return season
      }
      return null
    }

    // Try to find season from existing mapping
    const mapping = await this.titleMappingService.get(mapKey)
    if (mapping) {
      const mappedSeasonId = mapping.getSeasonId(automaticProviderId)
      if (mappedSeasonId !== undefined) {
        this.logger.debug('Mapping found, using mapped title', mapping)
        return this.seasonService.getById(mappedSeasonId)
      }
    }

    return null
  }

  /**
   * Searches for seasons using the automatic provider and returns results.
   */
  private async searchForSeasons(
    title: string,
    automaticProvider: ProviderConfig
  ): Promise<Season[]> {
    this.logger.debug('No mapping found, searching for season')

    const service = this.danmakuProviderFactory(automaticProvider)

    const foundSeasonInserts = (await service.search({
      keyword: title,
    })) as SeasonInsert[] // fixme: unsafe, fix this once we fold custom seasons into the season insert

    // check if the result is custom
    if (
      foundSeasonInserts[0] &&
      isProvider(foundSeasonInserts[0], DanmakuSourceType.MacCMS)
    ) {
      throw new Error('Custom season found, but not supported')
    }

    return this.seasonService.bulkUpsert(foundSeasonInserts)
  }

  async findMatchingEpisodes({
    mapKey,
    title,
    episodeNumber = 1,
    seasonId,
  }: MatchEpisodeInput): Promise<MatchEpisodeResult> {
    // 1. Check for local custom danmaku first
    const customEpisode = await this.findLocalCustomEpisode(title)
    if (customEpisode) {
      return {
        status: 'success',
        data: customEpisode,
      }
    }

    // 2. Get the automatic provider to use for searching
    const automaticProvider =
      await this.providerConfigService.getFirstAutomaticProvider()

    // 3. Try to find season from mapping or provided seasonId
    const mapping = await this.titleMappingService.get(mapKey)
    if (mapping || seasonId) {
      const season = await this.findSeasonFromMappingOrId(
        mapKey,
        seasonId,
        automaticProvider.id
      )

      if (!season) {
        return {
          status: 'notFound',
          data: null,
        }
      }

      return {
        status: 'success',
        data: await this.findEpisodeInSeason(season, episodeNumber),
      }
    }

    // 4. No mapping found, search for seasons
    const foundSeasons = await this.searchForSeasons(title, automaticProvider)

    if (foundSeasons.length === 0) {
      this.logger.debug(`No season found for title: ${title}`)
      return {
        status: 'notFound',
        data: null,
      }
    }

    // 5. Handle single season result - auto-save mapping
    if (foundSeasons.length === 1) {
      const firstSeason = foundSeasons[0] as Season

      this.logger.debug('Single season found', firstSeason)

      await this.titleMappingService.add(
        SeasonMap.fromSeason(mapKey, firstSeason)
      )

      return {
        status: 'success',
        data: await this.findEpisodeInSeason(firstSeason, episodeNumber),
      }
    }

    // 6. Multiple seasons found - require user disambiguation
    this.logger.debug(
      'Multiple seasons found, disambiguation required',
      foundSeasons
    )
    return {
      status: 'disambiguation',
      data: foundSeasons.filter(isNotCustom),
    }
  }

  async parseUrl(url: string): Promise<WithSeason<EpisodeMeta>> {
    if (this.parsers.length === 0) {
      await this.initParsers()
    }

    for (const provider of this.parsers) {
      if (provider.parseUrl && provider.canParse?.(url)) {
        const result = await provider.parseUrl(url)
        if (result) {
          const { episodeMeta, seasonInsert } = result
          const season = await this.seasonService.upsert(seasonInsert)

          return enrichEpisode(episodeMeta, season) as WithSeason<EpisodeMeta>
        }
      }
    }

    throw new Error('No provider found capable of parsing URL')
  }
}
