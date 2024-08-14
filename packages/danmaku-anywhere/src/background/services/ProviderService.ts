import * as bilibili from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { BiliBiliSearchParams } from '@danmaku-anywhere/danmaku-provider/bilibili'
import type {
  DanDanAnimeSearchAPIParams,
  DanDanCommentAPIParams,
} from '@danmaku-anywhere/danmaku-provider/ddp'
import { fetchComments } from '@danmaku-anywhere/danmaku-provider/ddp'
import * as danDanPlay from '@danmaku-anywhere/danmaku-provider/ddp'
import { match } from 'ts-pattern'

import type { MediaSearchParams } from '@/common/anime/dto'
import { DanmakuProviderType } from '@/common/anime/enums'
import type { DanDanPlayDanmaku } from '@/common/danmaku/models/entity/db'
import type {
  DanDanPlayMeta,
  DanDanPlayMetaDto,
} from '@/common/danmaku/models/meta'
import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/danmakuOptions/service'
import { invariant, isServiceWorker, tryCatch } from '@/common/utils/utils'

export class ProviderService {
  private logger: typeof Logger
  private extensionOptionsService = extensionOptionsService

  constructor() {
    invariant(isServiceWorker(), 'Provider is only available in service worker')
    this.logger = Logger.sub('[ProviderService]')
  }

  async searchDanDanPlay(searchParams: DanDanAnimeSearchAPIParams) {
    return danDanPlay.searchAnime(searchParams)
  }

  async searchBilibili(searchParams: BiliBiliSearchParams) {
    return bilibili.searchMedia(searchParams)
  }

  async searchByProvider(
    provider: DanmakuProviderType,
    searchParams: MediaSearchParams
  ) {
    this.logger.debug('Searching by provider', provider, searchParams)

    const data = await match(provider)
      .with(DanmakuProviderType.DanDanPlay, async (provider) => {
        const data = await this.searchDanDanPlay({
          anime: searchParams.keyword,
        })
        return {
          provider,
          data,
        }
      })
      .with(DanmakuProviderType.Bilibili, async (provider) => {
        const data = await this.searchBilibili({
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

    return data
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

  async getBiliBiliEpisodes(mediaId: number) {
    return bilibili.getBangumiInfo(mediaId)
  }

  private async getDanDanPlayEpisodeTitle(meta: DanDanPlayMetaDto) {
    const [bangumi, err] = await tryCatch(async () =>
      danDanPlay.getBangumiAnime(meta.animeId)
    )

    if (err) {
      this.logger.debug('Failed to get bangumi data', err)
      throw err
    }

    const episode = bangumi.episodes.find((e) => e.episodeId === meta.episodeId)

    return episode?.episodeTitle
  }

  async getDanDanPlayDanmaku(
    meta: DanDanPlayMetaDto,
    params: Partial<DanDanCommentAPIParams> = {}
  ): Promise<{
    meta: DanDanPlayMeta
    comments: DanDanPlayDanmaku['comments']
    params: DanDanCommentAPIParams
  }> {
    const {
      danmakuSources: {
        dandanplay: { chConvert: chConvertPreference },
      },
    } = await this.extensionOptionsService.get()

    // apply default params, use chConvert specified in options unless provided in params input
    const paramsCopy: DanDanCommentAPIParams = {
      chConvert: params.chConvert ?? chConvertPreference,
      withRelated: params.withRelated ?? true,
      from: params.from ?? 0,
    }

    // if title is not provided, try to get it from the server
    const episodeTitle =
      meta.episodeTitle ?? (await this.getDanDanPlayEpisodeTitle(meta))

    if (!episodeTitle) {
      this.logger.debug('Failed to get episode title from server')
      throw new Error('Failed to get episode title from server')
    }

    const newMeta = {
      ...meta,
      episodeTitle,
    }

    this.logger.debug('Fetching danmaku', meta, paramsCopy)

    const comments = await fetchComments(meta.episodeId, paramsCopy)

    this.logger.debug('Danmaku fetched from server', comments)

    return {
      meta: newMeta,
      comments,
      params: paramsCopy,
    }
  }
}
