import { match } from 'ts-pattern'

import { BilibiliService } from '@/background/services/BilibiliService'
import { DanDanPlayService } from '@/background/services/DanDanPlayService'
import { TencentService } from '@/background/services/TencentService'
import { TitleMappingService } from '@/background/services/TitleMappingService'
import type {
  MatchEpisodeInput,
  MatchEpisodeResult,
  MediaSearchParams,
  MediaSearchResult,
} from '@/common/anime/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type {
  BiliBiliMeta,
  DanDanPlayMeta,
  TencentMeta,
} from '@/common/danmaku/models/meta'
import { UnsupportedProviderException } from '@/common/danmaku/UnsupportedProviderException'
import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/danmakuOptions/service'
import { invariant, isServiceWorker } from '@/common/utils/utils'

export class ProviderService {
  private logger: typeof Logger
  private extensionOptionsService = extensionOptionsService
  private bilibiliService = new BilibiliService()
  private danDanPlayService = new DanDanPlayService()
  private tencentService = new TencentService()
  private titleMappingService = new TitleMappingService()

  constructor() {
    invariant(
      isServiceWorker(),
      'ProviderService is only available in service worker'
    )
    this.logger = Logger.sub('[ProviderService]')
  }

  async searchByProvider<T extends DanmakuSourceType>(
    provider: T,
    searchParams: MediaSearchParams
  ): Promise<Extract<MediaSearchResult, { provider: T }>> {
    this.logger.debug('Searching by provider', provider, searchParams)

    const data = await match(provider as DanmakuSourceType)
      .with(DanmakuSourceType.DanDanPlay, async (provider) => {
        const data = await this.danDanPlayService.search({
          anime: searchParams.keyword,
          episode: searchParams.episode,
        })
        return {
          provider,
          data,
        }
      })
      .with(DanmakuSourceType.Bilibili, async (provider) => {
        const data = await this.bilibiliService.search({
          keyword: searchParams.keyword,
        })
        return {
          provider,
          data,
        }
      })
      .with(DanmakuSourceType.Tencent, async (provider) => {
        const data = await this.tencentService.search(searchParams.keyword)
        return {
          provider,
          data,
        }
      })
      .otherwise((type) => {
        throw new UnsupportedProviderException(type)
      })

    return data as Extract<MediaSearchResult, { provider: T }>
  }

  async searchByProviders(
    searchParams: MediaSearchParams,
    providers: DanmakuSourceType[]
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
          provider: DanmakuSourceType.DanDanPlay,
        } satisfies DanDanPlayMeta,
      }
    }

    this.logger.debug('No mapping found, searching for season')
    const searchResult = await this.searchByProvider(
      DanmakuSourceType.DanDanPlay,
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
        provider: DanmakuSourceType.DanDanPlay,
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

  async getBilibiliEpisodes(seasonId: number) {
    const res = await this.bilibiliService.getBangumiInfo({ seasonId })
    return res.episodes
  }

  async getTencentEpisodes(seasonId: string) {
    return this.tencentService.getEpisodes(seasonId)
  }

  async parseUrl(url: string) {
    const { hostname, pathname } = new URL(url)

    if (hostname === 'www.bilibili.com') {
      // https://www.bilibili.com/bangumi/play/ss3421?spm_id_from=333.337.0.0
      const ssid = pathname.match(/ss(\d+)/)?.[1]
      const epid = pathname.match(/ep(\d+)/)?.[1]

      // we need one of ssid or epid
      if (!ssid && !epid) throw new Error('Invalid bilibili url')

      const info = await this.bilibiliService.getBangumiInfo({
        seasonId: ssid ? parseInt(ssid) : undefined,
        episodeId: epid ? parseInt(epid) : undefined,
      })

      // if using season id, get the first episode
      const episode = epid
        ? info.episodes.find((episode) => episode.id === parseInt(epid))
        : info.episodes[0]

      if (!episode) throw new Error('Episode not found')

      return {
        provider: DanmakuSourceType.Bilibili,
        cid: episode.cid,
        bvid: episode.bvid,
        aid: episode.aid,
        seasonId: info.season_id,
        title: episode.long_title || episode.share_copy,
        seasonTitle: info.title,
        mediaType: info.type,
      } satisfies BiliBiliMeta
    } else if (hostname === 'v.qq.com') {
      // https://v.qq.com/x/cover/mzc00200ztsl4to/m4100bardal.html
      const [, cid, vid] = pathname.match(/cover\/(.*)\/(.*)\.html/) ?? []

      if (!cid || !vid) throw new Error('Invalid tencent url')

      // get name of the show
      const pageDetails = await this.tencentService.getPageDetails(cid, vid)
      const seasonTitle =
        pageDetails.module_list_datas[0]?.module_datas[0]?.item_data_lists
          ?.item_datas[0]?.item_params?.title
      if (!seasonTitle) throw new Error('Season not found')

      // get the name of the episode
      const episodes = await this.tencentService.getEpisodes(cid, vid)
      const matchingEpisode = episodes.find((episode) => episode.vid === vid)
      if (!matchingEpisode) throw new Error('Episode not found')

      const episodeTitle = matchingEpisode.play_title

      return {
        provider: DanmakuSourceType.Tencent,
        cid,
        vid,
        seasonTitle,
        episodeTitle,
      } satisfies TencentMeta
    }

    throw new Error('Unknown host')
  }
}
