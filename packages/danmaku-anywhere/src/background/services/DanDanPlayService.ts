import type {
  DanDanAnimeSearchAPIParams,
  DanDanCommentAPIParams,
} from '@danmaku-anywhere/danmaku-provider/ddp'
import { fetchComments } from '@danmaku-anywhere/danmaku-provider/ddp'
import * as danDanPlay from '@danmaku-anywhere/danmaku-provider/ddp'

import type { DanDanPlayDanmaku } from '@/common/danmaku/models/danmaku'
import type {
  DanDanPlayMeta,
  DanDanPlayMetaDto,
} from '@/common/danmaku/models/meta'
import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/danmakuOptions/service'
import { tryCatch } from '@/common/utils/utils'

export class DanDanPlayService {
  private logger: typeof Logger
  private extensionOptionsService = extensionOptionsService

  constructor() {
    this.logger = Logger.sub('[DDPService]')
  }

  async search(searchParams: DanDanAnimeSearchAPIParams) {
    this.logger.debug('Searching DanDanPlay', searchParams)
    const result = await danDanPlay.searchAnime(searchParams)
    this.logger.debug('Search result', result)
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

    // if title is not provided, try to get it from the server
    const episodeTitle =
      meta.episodeTitle ??
      (await this.getEpisodeTitle(meta.animeId, meta.episodeId))

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
