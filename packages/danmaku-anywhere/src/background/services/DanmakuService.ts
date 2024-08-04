import type { DanDanCommentAPIParams } from '@danmaku-anywhere/dandanplay-api'
import { fetchComments, getAnime } from '@danmaku-anywhere/dandanplay-api'
import type Dexie from 'dexie'
import { produce } from 'immer'
import { match } from 'ts-pattern'

import type { DanmakuDeleteDto, DanmakuGetOneDto } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type {
  CustomDanmakuCacheDbModelInsert,
  DanmakuCacheDbModel,
} from '@/common/danmaku/models/danmakuCache/db'
import type {
  DanmakuCache,
  DanmakuCacheImportDto,
  DanmakuCacheLite,
} from '@/common/danmaku/models/danmakuCache/dto'
import type { CustomDanmakuCreateDto } from '@/common/danmaku/models/danmakuImport/customDanmaku'
import type { DDPDanmakuMeta } from '@/common/danmaku/models/danmakuMeta'
import type { DanmakuFetchOptions } from '@/common/danmaku/types'
import { toDanmakuCache } from '@/common/danmaku/utils'
import { db } from '@/common/db/db'
import { Logger } from '@/common/Logger'
import { extensionOptionsService } from '@/common/options/danmakuOptions/service'
import { RpcException } from '@/common/rpc/types'
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
      return toDanmakuCache(existingDanmaku)
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
      existingDanmaku.comments.length > 0 &&
      existingDanmaku.comments.length >= comments.comments.length
    ) {
      this.logger.debug('New danmaku has less comments, skip caching')
      return toDanmakuCache(existingDanmaku)
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

      if (err) {
        this.logger.debug('Failed to fetch anime', err)
        throw err
      }

      const episode = anime.bangumi.episodes.find(
        (e) => e.episodeId === meta.episodeId
      )
      if (episode) {
        this.logger.debug(`Found episode title: ${episode.episodeTitle}`)
        newEntry.meta.episodeTitle = episode.episodeTitle
      } else {
        this.logger.debug('Episode title not found')
        throw new Error('Episode title not found')
      }
    }

    await this.ddpTable.put(newEntry)

    this.logger.debug('Cached danmaku to db')

    return toDanmakuCache(newEntry)
  }

  async delete(data: DanmakuDeleteDto) {
    return match(data)
      .with({ type: DanmakuSourceType.DDP }, (data) => {
        return this.ddpTable.delete(data.id)
      })
      .with({ type: DanmakuSourceType.Custom }, (data) => {
        return this.customTable.delete(data.id)
      })
      .otherwise(() => {
        throw new RpcException(`Unknown danmaku type: ${data.type}`)
      })
  }

  async createCustom(data: CustomDanmakuCreateDto[]) {
    const createCache = (dto: CustomDanmakuCreateDto) => {
      const { comments, animeTitle, episodeNumber, episodeTitle } = dto

      const cache: CustomDanmakuCacheDbModelInsert = {
        comments,
        meta: {
          episodeNumber,
          animeTitle,
          episodeTitle,
          type: DanmakuSourceType.Custom,
          // episodeId is auto generated after creation
        },
        version: 1,
        timeUpdated: Date.now(),
      } as const

      return cache
    }

    this.customTable.bulkAdd(data.map(createCache))
  }

  async import(data: DanmakuCacheImportDto[]) {
    const ddp = data.filter((d) => d.type === DanmakuSourceType.DDP)
    const custom = data.filter((d) => d.type === DanmakuSourceType.Custom)

    if (ddp.length > 0) await this.ddpTable.bulkPut(ddp)
    if (custom.length > 0) await this.customTable.bulkPut(custom)
  }

  /**
   * Avoid using this method because it will load all danmaku from db at once
   * which may cause performance issues or even crash when there are too many danmaku in db
   */
  async getAll() {
    const ddpResult = await this.ddpTable.toArray()
    const customResult = await this.customTable.toArray()

    const danmakuCache: DanmakuCache[] = [
      ...ddpResult.map((data) => toDanmakuCache(data)),
      ...customResult.map((data) => toDanmakuCache(data)),
    ]

    return danmakuCache
  }

  /**
   * Get only the count and metadata of all danmaku in db
   */
  async getAllLite(type?: DanmakuSourceType) {
    const tables = match(type)
      .with(DanmakuSourceType.DDP, () => [
        {
          table: this.ddpTable,
          type: DanmakuSourceType.DDP,
        },
      ])
      .with(DanmakuSourceType.Custom, () => [
        {
          table: this.customTable,
          type: DanmakuSourceType.Custom,
        },
      ])
      .otherwise(() => [
        {
          table: this.ddpTable,
          type: DanmakuSourceType.DDP,
        },
        {
          table: this.customTable,
          type: DanmakuSourceType.Custom,
        },
      ])

    const data = await Promise.all(tables.map((type) => this._getAllLite(type)))

    return data.flat()
  }

  async getOne(data: DanmakuGetOneDto) {
    return match(data)
      .with({ type: DanmakuSourceType.DDP }, async (data) => {
        const res = await this.ddpTable.get(data.id)
        if (res) return toDanmakuCache(res)
      })
      .with({ type: DanmakuSourceType.Custom }, async (data) => {
        const res = await this.customTable.get(data.id)
        if (res) return toDanmakuCache(res)
      })
      .otherwise(() => {
        throw new RpcException(`Unknown danmaku type: ${data.type}`)
      })
  }

  private async _getAllLite({
    table,
    type,
  }: {
    table: Dexie.Table<DanmakuCacheDbModel, any, any>
    type: DanmakuSourceType
  }) {
    const cache: DanmakuCacheLite[] = []

    await table.toCollection().each((item) => {
      cache.push({
        count: item.comments.length,
        meta: item.meta,
        type,
      })
    })

    return cache
  }
}
