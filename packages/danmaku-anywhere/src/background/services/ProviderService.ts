import { match } from 'ts-pattern'

import { BilibiliService } from '@/background/services/BilibiliService'
import { DanDanPlayService } from '@/background/services/DanDanPlayService'
import { TitleMappingService } from '@/background/services/TitleMappingService'
import type {
  GetEpisodeDto,
  MatchEpisodeInput,
  MatchEpisodeResult,
  MediaSearchParams,
  MediaSearchResult,
} from '@/common/anime/dto'
import { DanmakuProviderType } from '@/common/anime/enums'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanDanPlayMeta } from '@/common/danmaku/models/meta'
import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/danmakuOptions/service'
import { invariant, isServiceWorker } from '@/common/utils/utils'

export class ProviderService {
  private logger: typeof Logger
  private extensionOptionsService = extensionOptionsService
  private bilibiliService = new BilibiliService()
  private danDanPlayService = new DanDanPlayService()
  private titleMappingService = new TitleMappingService()

  constructor() {
    invariant(
      isServiceWorker(),
      'ProviderService is only available in service worker'
    )
    this.logger = Logger.sub('[ProviderService]')
  }

  async searchByProvider<T extends DanmakuProviderType>(
    provider: T,
    searchParams: MediaSearchParams
  ): Promise<Extract<MediaSearchResult, { provider: T }>> {
    this.logger.debug('Searching by provider', provider, searchParams)

    const data = await match(provider as DanmakuProviderType)
      .with(DanmakuProviderType.DanDanPlay, async (provider) => {
        const data = await this.danDanPlayService.search({
          anime: searchParams.keyword,
          episode: searchParams.episode,
        })
        return {
          provider,
          data,
        }
      })
      .with(DanmakuProviderType.Bilibili, async (provider) => {
        const data = await this.bilibiliService.search({
          keyword: searchParams.keyword,
        })
        return {
          provider,
          data,
        }
      })
      .otherwise(() => {
        throw new Error('Provider not supported')
      })

    return data as Extract<MediaSearchResult, { provider: T }>
  }

  async searchByProviders(
    searchParams: MediaSearchParams,
    providers: DanmakuProviderType[]
  ) {
    const searchPromises = providers.map(async (provider) => {
      return this.searchByProvider(provider, searchParams)
    })

    return Promise.all(searchPromises)
  }

  async findMatchingEpisodes({
    mapKey,
    title,
    episodeNumber,
    integration,
  }: MatchEpisodeInput): Promise<MatchEpisodeResult> {
    const mapping = await this.titleMappingService.getMappedTitle(
      mapKey,
      integration
    )

    if (mapping) {
      this.logger.debug('Mapping found, using mapped title', mapping)

      const episodeId = this.danDanPlayService.computeEpisodeId(
        mapping.animeId,
        episodeNumber
      )
      const episodeTitle = await this.danDanPlayService.getEpisodeTitle(
        mapping.animeId,
        episodeId
      )

      if (!episodeTitle) {
        this.logger.debug('Failed to get episode title from server')
        throw new Error('Failed to get episode title from server')
      }

      return {
        status: 'success',
        data: {
          animeId: mapping.animeId,
          animeTitle: mapping.title,
          episodeId,
          episodeTitle,
          provider: DanmakuSourceType.DDP,
        } satisfies DanDanPlayMeta,
      }
    }

    this.logger.debug('No mapping found, searching for season')
    const searchResult = await this.searchByProvider(
      DanmakuProviderType.DanDanPlay,
      {
        keyword: title,
        episode: episodeNumber.toString(),
      }
    )

    if (searchResult.data.length === 0) {
      this.logger.debug(`No season found for title: ${title}`)
      return {
        status: 'notFound',
        data: null,
      }
    }

    if (searchResult.data.length === 1) {
      this.logger.debug('Single season found', searchResult.data[0])
      const result = searchResult.data[0]

      const meta: DanDanPlayMeta = {
        animeId: result.animeId,
        animeTitle: result.animeTitle,
        episodeId: result.episodes[0].episodeId,
        episodeTitle: result.episodes[0].episodeTitle,
        provider: DanmakuSourceType.DDP,
      }

      return {
        status: 'success',
        data: meta,
      }
    }

    this.logger.debug(
      'Multiple seasons found, disambiguation required',
      searchResult.data
    )
    return {
      status: 'disambiguation',
      data: searchResult,
    }
  }

  async getEpisodes(data: GetEpisodeDto) {
    if (data.provider === DanmakuProviderType.Bilibili) {
      return this.bilibiliService.getBangumiInfo(data.seasonId)
    }
    throw new Error('Provider not supported')
  }
}
