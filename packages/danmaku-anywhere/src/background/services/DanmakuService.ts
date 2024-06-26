import type { DanDanCommentAPIParams } from '@danmaku-anywhere/dandanplay-api'
import { fetchComments, getAnime } from '@danmaku-anywhere/dandanplay-api'
import type Dexie from 'dexie'
import { match } from 'ts-pattern'

import { db } from '@/common/db/db'
import { RpcException } from '@/common/rpc/rpc'
import { Logger } from '@/common/services/Logger'
import { DanmakuType } from '@/common/types/danmaku/Danmaku'
import type {
  DDPDanmakuMeta,
  DanmakuCache,
  DanmakuCacheLite,
  DanmakuDeleteDto,
  DanmakuGetOneDto,
  ManualDanmakuCreateDto,
  ManualDanmakuMeta,
} from '@/common/types/danmaku/Danmaku'
import type { DanmakuFetchOptions } from '@/common/types/DanmakuFetchOptions'
import { invariant, isServiceWorker, tryCatch } from '@/common/utils/utils'

export class DanmakuService {
  private ddpTable = db.danmakuCache
  private manualTable = db.manualDanmakuCache
  private logger: typeof Logger

  constructor() {
    invariant(
      isServiceWorker(),
      'DanmakuService is only available in service worker'
    )
    this.logger = Logger.sub('[DanmakuService]')
  }

  async fetchDDP(
    meta: DDPDanmakuMeta,
    params: Partial<DanDanCommentAPIParams> = { withRelated: true },
    options: DanmakuFetchOptions = {}
  ) {
    const { episodeId } = meta

    const result = await this.ddpTable.get(episodeId)

    if (result && !options.forceUpdate) {
      this.logger.debug('Danmaku found in db', result)
      return result
    }

    this.logger.debug('Danmaku not found in db, fetching from server')

    const comments = await fetchComments(episodeId, {
      ...params,
      withRelated: true,
    })

    this.logger.debug('Danmaku fetched from server', comments)

    // prevent updating db if new result has less comments than the old one
    if (
      result &&
      result.comments.length > 0 &&
      result.comments.length >= comments.comments.length
    ) {
      this.logger.debug('New danmaku has less comments, skip caching')
      return result
    }

    const newEntry = {
      ...comments,
      meta: meta,
      params,
      timeUpdated: Date.now(),
      version: 1 + (result?.version ?? 0),
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
        return this.manualTable.delete(data.id)
      })
      .otherwise(() => {
        throw new RpcException(`Unknown danmaku type: ${data.type}`)
      })
  }

  async createManual(data: ManualDanmakuCreateDto) {
    const createCache = (dto: ManualDanmakuCreateDto[number]) => {
      const { comments, animeTitle, episodeNumber, episodeTitle } = dto

      const cache = {
        comments,
        meta: {
          type: DanmakuType.Custom,
          episodeNumber,
          animeTitle,
          episodeTitle,
          // episodeId is auto generated after creation
        } as ManualDanmakuMeta,
        version: 1,
        timeUpdated: Date.now(),
        count: comments.length,
      } as const

      return cache
    }

    this.manualTable.bulkAdd(data.map(createCache))
  }

  /**
   * Avoid using this method because it will load all danmaku from db at once
   * which may cause performance issues or even crash when there are too many danmaku in db
   */
  async getAll() {
    return this.ddpTable.toArray()
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

  /**
   * Get only the count and metadata of all danmaku in db
   */
  async getAllLite(type?: DanmakuType) {
    const tables = match(type)
      .with(DanmakuType.DDP, () => [this.ddpTable])
      .with(DanmakuType.Custom, () => [this.manualTable])
      .otherwise(() => [this.ddpTable, this.manualTable])

    const data = await Promise.all(tables.map((type) => this._getAllLite(type)))

    return data.flat()
  }

  async getOne(data: DanmakuGetOneDto) {
    return match(data)
      .with({ type: DanmakuType.DDP }, (data) => {
        return this.ddpTable.get(data.id)
      })
      .with({ type: DanmakuType.Custom }, (data) => {
        return this.manualTable.get(data.id)
      })
      .otherwise(() => {
        throw new RpcException(`Unknown danmaku type: ${data.type}`)
      })
  }
}
