import type { DanDanCommentAPIParams } from '@danmaku-anywhere/dandanplay-api'
import { fetchComments, getAnime } from '@danmaku-anywhere/dandanplay-api'
import type Dexie from 'dexie'
import { produce } from 'immer'
import { match } from 'ts-pattern'

import { extensionOptionsService } from '@/background/syncOptions/upgradeOptions'
import { db } from '@/common/db/db'
import { RpcException } from '@/common/rpc/rpc'
import { Logger } from '@/common/services/Logger'
import type {
  CustomDanmakuCreateDto,
  CustomDanmakuMeta,
  DanmakuCache,
  DanmakuCacheLite,
  DanmakuDeleteDto,
  DanmakuGetOneDto,
  DDPDanmakuMeta,
} from '@/common/types/danmaku/Danmaku'
import { DanmakuType } from '@/common/types/danmaku/Danmaku'
import type { DanmakuFetchOptions } from '@/common/types/DanmakuFetchOptions'
import { invariant, isServiceWorker, tryCatch } from '@/common/utils/utils'

export class DanmakuService {
  private ddpTable = db.danmakuCache
  private customTable = db.manualDanmakuCache
  private logger: typeof Logger
  private extensionOptionsService = extensionOptionsService

  constructor() {
    invariant(
      isServiceWorker(),
      'DanmakuService is only available in service worker'
    )
    this.logger = Logger.sub('[DanmakuService]')
  }

  async fetchDDP(
    meta: DDPDanmakuMeta,
    params: Partial<DanDanCommentAPIParams> = {},
    options: DanmakuFetchOptions = {}
  ) {
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

    const existingDanmaku = await this.ddpTable.get(episodeId)

    if (existingDanmaku && !options.forceUpdate) {
      this.logger.debug('Danmaku found in db', existingDanmaku)
      return existingDanmaku
    }

    this.logger.debug('Danmaku not found in db, fetching from server')

    const comments = await fetchComments(episodeId, paramsCopy)

    this.logger.debug('Danmaku fetched from server', comments)

    // prevent updating db if new result has fewer comments than the old one
    if (
      !options.forceUpdate &&
      existingDanmaku &&
      existingDanmaku.comments.length > 0 &&
      existingDanmaku.comments.length >= comments.comments.length
    ) {
      this.logger.debug('New danmaku has less comments, skip caching')
      return existingDanmaku
    }

    const newEntry = {
      ...comments,
      meta: meta,
      params: paramsCopy,
      timeUpdated: Date.now(),
      version: 1 + (existingDanmaku?.version ?? 0),
    }

    // if episode title is not provided, try to get it from the server
    if (meta.episodeTitle === undefined) {
      this.logger.debug(
        'Episode title not provided, trying to fetch from server'
      )

      const [anime, err] = await tryCatch(async () => getAnime(meta.animeId))
      if (!err) {
        const episode = anime.bangumi.episodes.find(
          (e) => e.episodeId === meta.episodeId
        )
        if (episode) {
          this.logger.debug(`Found episode title: ${episode.episodeTitle}`)
          newEntry.meta.episodeTitle = episode.episodeTitle
        }
      }
    }

    await this.ddpTable.put(newEntry)

    this.logger.debug('Cached danmaku to db')

    return newEntry
  }

  async delete(data: DanmakuDeleteDto) {
    return match(data)
      .with({ type: DanmakuType.DDP }, (data) => {
        return this.ddpTable.delete(data.id)
      })
      .with({ type: DanmakuType.Custom }, (data) => {
        return this.customTable.delete(data.id)
      })
      .otherwise(() => {
        throw new RpcException(`Unknown danmaku type: ${data.type}`)
      })
  }

  async createCustom(data: CustomDanmakuCreateDto) {
    const createCache = (dto: CustomDanmakuCreateDto[number]) => {
      const { comments, animeTitle, episodeNumber, episodeTitle } = dto

      const cache = {
        comments,
        meta: {
          type: DanmakuType.Custom,
          episodeNumber,
          animeTitle,
          episodeTitle,
          // episodeId is auto generated after creation
        } as CustomDanmakuMeta,
        version: 1,
        timeUpdated: Date.now(),
        count: comments.length,
      } as const

      return cache
    }

    this.customTable.bulkAdd(data.map(createCache))
  }

  /**
   * Avoid using this method because it will load all danmaku from db at once
   * which may cause performance issues or even crash when there are too many danmaku in db
   */
  async getAll() {
    return this.ddpTable.toArray()
  }

  /**
   * Get only the count and metadata of all danmaku in db
   */
  async getAllLite(type?: DanmakuType) {
    const tables = match(type)
      .with(DanmakuType.DDP, () => [this.ddpTable])
      .with(DanmakuType.Custom, () => [this.customTable])
      .otherwise(() => [this.ddpTable, this.customTable])

    const data = await Promise.all(tables.map((type) => this._getAllLite(type)))

    return data.flat()
  }

  async getOne(data: DanmakuGetOneDto) {
    return match(data)
      .with({ type: DanmakuType.DDP }, (data) => {
        return this.ddpTable.get(data.id)
      })
      .with({ type: DanmakuType.Custom }, (data) => {
        return this.customTable.get(data.id)
      })
      .otherwise(() => {
        throw new RpcException(`Unknown danmaku type: ${data.type}`)
      })
  }

  private async _getAllLite(table: Dexie.Table<DanmakuCache>) {
    const cache: DanmakuCacheLite[] = []

    await table.toCollection().each((item) => {
      cache.push({
        count: item.count,
        meta: item.meta,
        type: item.meta.type,
      })
    })

    return cache
  }
}
