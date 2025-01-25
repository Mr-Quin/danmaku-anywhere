import type {
  DanDanSearchEpisodesAPIParams,
  DanDanCommentAPIParams,
} from '@danmaku-anywhere/danmaku-provider/ddp'
import { getCommentsWithRelated } from '@danmaku-anywhere/danmaku-provider/ddp'
import * as danDanPlay from '@danmaku-anywhere/danmaku-provider/ddp'

import type { DanDanPlayDanmaku } from '@/common/danmaku/models/danmaku'
import type {
  DanDanPlayMeta,
  DanDanPlayMetaDto,
} from '@/common/danmaku/models/meta'
import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/extensionOptions/service'
import { tryCatch } from '@/common/utils/utils'

export class DanDanPlayService {
  private logger: typeof Logger
  private extensionOptionsService = extensionOptionsService

  constructor() {
    this.logger = Logger.sub('[DDPService]')
  }

  async search(searchParams: DanDanSearchEpisodesAPIParams) {
    this.logger.debug('Searching DanDanPlay', searchParams)
    const result = await danDanPlay.searchAnime(searchParams.anime)
    this.logger.debug('Search result', result)
    return result
  }

  async getAnimeDetails(animeId: number) {
    this.logger.debug('Getting DanDanPlay episodes', animeId)
    const result = await danDanPlay.getBangumiAnime(animeId)
    this.logger.debug('DanDanPlay Episodes fetched', result)
    return result
  }

  computeEpisodeId(animeId: number, episodeNumber: number) {
    return animeId * 10000 + episodeNumber
  }

  async getEpisodeTitle(animeId: number, episodeId: number) {
    const [bangumi, err] = await tryCatch(async () =>
      danDanPlay.getBangumiAnime(animeId)
    )

    if (err) {
      this.logger.debug('Failed to get bangumi data', err)
      throw err
    }

    const episode = bangumi.episodes.find((e) => e.episodeId === episodeId)

    return episode?.episodeTitle
  }

  async getDanmaku(
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

    // since title can change, we'll try to update it
    const episodeTitle =
      (await this.getEpisodeTitle(meta.animeId, meta.episodeId)) ??
      meta.episodeTitle // if for some reason we can't get the title, use the one we have

    if (!episodeTitle) {
      this.logger.debug('Failed to get episode title from server')
      throw new Error('Failed to get episode title from server')
    }

    const newMeta = {
      ...meta,
      episodeTitle,
    }

    this.logger.debug('Fetching danmaku', meta, paramsCopy)

    const comments = await getCommentsWithRelated(meta.episodeId, paramsCopy)

    this.logger.debug('Danmaku fetched from server', comments)

    return {
      meta: newMeta,
      comments,
      params: paramsCopy,
    }
  }
}
