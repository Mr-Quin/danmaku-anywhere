import type { DanDanCommentAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'
import {
  fetchComments,
  getBangumiAnime,
} from '@danmaku-anywhere/danmaku-provider/ddp'
import { produce } from 'immer'

import type {
  DanmakuDeleteDto,
  DanmakuGetBySeasonDto,
  DanmakuGetManyDto,
  DanmakuGetOneDto,
} from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type {
  CustomDanmakuInsert,
  DanDanPlayDanmaku,
  DanDanPlayDanmakuInsert,
  DanmakuInsert,
  DanmakuLite,
} from '@/common/danmaku/models/entity/db'
import type { CustomDanmakuCreateData } from '@/common/danmaku/models/entity/dto'
import type { DanDanPlayMeta } from '@/common/danmaku/models/meta'
import type { DanmakuFetchOptions } from '@/common/danmaku/types'
import { assertIsDanmaku, CURRENT_SCHEMA_VERSION } from '@/common/danmaku/utils'
import { db } from '@/common/db/db'
import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/danmakuOptions/service'
import { invariant, isServiceWorker, tryCatch } from '@/common/utils/utils'

export class DanmakuService {
  private ddpTable = db.danmakuCache
  private logger: typeof Logger
  private extensionOptionsService = extensionOptionsService

  constructor() {
    invariant(
      isServiceWorker(),
      'DanmakuService is only available in service worker'
    )
    this.logger = Logger.sub('[DanmakuService]')
  }

  async getEpisodeTitle(meta: DanDanPlayMeta) {
    const [bangumi, err] = await tryCatch(async () =>
      getBangumiAnime(meta.animeId)
    )

    if (err) {
      this.logger.debug('Failed to get bangumi data', err)
      throw err
    }

    const episode = bangumi.episodes.find((e) => e.episodeId === meta.episodeId)

    return episode?.episodeTitle
  }

  async fetchDDP(
    meta: DanDanPlayMeta,
    params: Partial<DanDanCommentAPIParams> = {},
    options: DanmakuFetchOptions = {}
  ): Promise<DanDanPlayDanmaku> {
    const {
      danmakuSources: {
        dandanplay: { chConvert: chConvertPreference },
      },
    } = await this.extensionOptionsService.get()

    // apply default params, use chConvert specified in options unless provided in params input
    const paramsCopy = produce(params, (draft) => {
      draft.chConvert ??= chConvertPreference
      draft.withRelated ??= true
      draft.from ??= 0
    })

    const { episodeId } = meta

    const existingDanmaku = await this.ddpTable.get({
      provider: DanmakuSourceType.DDP,
      episodeId: episodeId,
    })

    if (existingDanmaku && !options.forceUpdate) {
      this.logger.debug('Danmaku found in db', existingDanmaku)
      assertIsDanmaku(existingDanmaku, DanmakuSourceType.DDP)
      return existingDanmaku
    }

    if (options.forceUpdate) {
      this.logger.debug('Force update flag set, bypassed cache')
    } else {
      this.logger.debug('Danmaku not found in db, fetching from server')
    }

    const comments = await fetchComments(episodeId, paramsCopy)

    this.logger.debug('Danmaku fetched from server', comments)

    // prevent updating db if new result has fewer comments than the old one
    if (
      !options.forceUpdate &&
      existingDanmaku &&
      existingDanmaku.commentCount > 0 &&
      existingDanmaku.commentCount >= comments.length
    ) {
      this.logger.debug('New danmaku has less comments, skip caching')
      assertIsDanmaku(existingDanmaku, DanmakuSourceType.DDP)
      return existingDanmaku
    }

    const getEpisodeTitle = async () => {
      if (meta.episodeTitle !== undefined) return meta.episodeTitle
      // if episode title is not provided, try to get it from the server

      this.logger.debug(
        'Episode title not provided, trying to fetch from server'
      )
      const episodeTitle = await this.getEpisodeTitle(meta)

      if (episodeTitle === undefined) {
        this.logger.debug('Episode title not found')
        throw new Error('Episode title not found')
      }
      this.logger.debug(`Found episode title: ${episodeTitle}`)
      return episodeTitle
    }

    const episodeTitle = await getEpisodeTitle()

    const newEntry: DanDanPlayDanmakuInsert = {
      provider: DanmakuSourceType.DDP,
      comments,
      commentCount: comments.length,
      meta: meta,
      episodeId: episodeId,
      episodeTitle,
      seasonId: meta.animeId,
      seasonTitle: meta.animeTitle,
      params: paramsCopy,
      timeUpdated: Date.now(),
      version: 1 + (existingDanmaku?.version ?? 0),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    }

    if (existingDanmaku) {
      this.logger.debug('Updating existing danmaku entry')
      await this.ddpTable.update(existingDanmaku.id, newEntry)

      return {
        ...newEntry,
        id: existingDanmaku.id,
      }
    } else {
      const id = await this.ddpTable.put(newEntry)

      this.logger.debug('Cached danmaku to db')

      return {
        ...newEntry,
        id: id,
      }
    }
  }

  async delete(data: DanmakuDeleteDto) {
    return this.ddpTable.delete(data)
  }

  async createCustom(data: CustomDanmakuCreateData[]) {
    const createCache = (dto: CustomDanmakuCreateData) => {
      const { comments, seasonTitle, episodeTitle } = dto

      const cache: CustomDanmakuInsert = {
        provider: DanmakuSourceType.Custom,
        comments,
        commentCount: comments.length,
        meta: {
          seasonTitle: seasonTitle,
          episodeTitle,
          provider: DanmakuSourceType.Custom,
          // episodeId is auto generated after creation
        },
        episodeTitle: episodeTitle,
        seasonTitle: seasonTitle,
        version: 1,
        timeUpdated: Date.now(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      }

      return cache
    }

    this.ddpTable.bulkAdd(data.map(createCache))
  }

  async import(data: DanmakuInsert[]) {
    await this.ddpTable.bulkPut(data)
  }

  /**
   * Avoid using this method because it will load all danmaku from db at once
   * which may cause performance issues or even crash when there are too many danmaku in db
   */
  async getAll() {
    return this.ddpTable.orderBy(['provider+episodeId']).toArray()
  }

  /**
   * Get only the count and metadata of all danmaku in db
   */
  async getAllLite(type?: DanmakuSourceType) {
    const cache: DanmakuLite[] = []

    await this.ddpTable
      // .orderBy(['provider+episodeId'])
      .filter((d) => {
        if (type) {
          return d.provider === type
        }
        return true
      })
      .each((item) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { comments: _, ...rest } = item

        cache.push(rest)
      })

    return cache
  }

  async getOne(data: DanmakuGetOneDto) {
    return this.ddpTable.get(data)
  }

  async getMany(data: DanmakuGetManyDto) {
    const res = await this.ddpTable.bulkGet(data)
    return res.filter((r) => r !== undefined)
  }

  async getByAnimeId(data: DanmakuGetBySeasonDto) {
    return this.ddpTable
      .filter((d) => {
        if (d.provider === DanmakuSourceType.DDP) {
          return d.meta.animeId === data.id
        }
        return false
      })
      .toArray()
  }

  async deleteAll() {
    await this.ddpTable.clear()
  }
}
