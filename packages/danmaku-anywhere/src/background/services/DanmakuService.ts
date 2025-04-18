import { match } from 'ts-pattern'

import { BilibiliService } from '@/background/services/BilibiliService'
import { DanDanPlayService } from '@/background/services/DanDanPlayService'
import { TencentService } from '@/background/services/TencentService'
import { TitleMappingService } from '@/background/services/TitleMappingService'
import { Logger } from '@/common/Logger'
import { CURRENT_SCHEMA_VERSION } from '@/common/danmaku/constants'
import type {
  CustomDanmakuCreateData,
  DanmakuDeleteDto,
  DanmakuFetchDto,
  DanmakuGetBySeasonDto,
  DanmakuGetManyDto,
  DanmakuGetOneDto,
} from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type {
  BiliBiliDanmakuInsert,
  CustomDanmakuInsert,
  DanDanPlayDanmakuInsert,
  Danmaku,
  DanmakuInsert,
  DanmakuLite,
  TencentDanmakuInsert,
} from '@/common/danmaku/models/danmaku'
import {
  assertDanmakuProvider,
  getEpisodeId,
  isDanmakuProvider,
} from '@/common/danmaku/utils'
import { db } from '@/common/db/db'
import { invariant, isServiceWorker } from '@/common/utils/utils'

export class DanmakuService {
  private ddpTable = db.danmaku
  private logger: typeof Logger
  private bilibiliService = new BilibiliService()
  private danDanPlayService = new DanDanPlayService()
  private tencentService = new TencentService()
  private titleMappingService = new TitleMappingService()

  constructor() {
    invariant(
      isServiceWorker(),
      'DanmakuService is only available in service worker'
    )
    this.logger = Logger.sub('[DanmakuService]')
  }

  async getDanmaku(data: DanmakuFetchDto): Promise<Danmaku> {
    const { meta, options = {}, context } = data
    const episodeId = getEpisodeId(meta)
    const provider = meta.provider

    // Save title mapping
    if (context) {
      this.logger.debug('Saving title mapping', context)
      if (isDanmakuProvider(meta, DanmakuSourceType.DanDanPlay)) {
        void this.titleMappingService.add({
          title: meta.animeTitle,
          originalTitle: context.key,
          animeId: meta.animeId,
        })
      }
    }

    const existingDanmaku = await this.ddpTable.get({ provider, episodeId })

    if (existingDanmaku && !options.forceUpdate) {
      this.logger.debug('Danmaku found in db', existingDanmaku)
      assertDanmakuProvider(existingDanmaku, provider)
      return existingDanmaku
    }

    if (options.forceUpdate) {
      this.logger.debug('Force update flag set, bypassed cache')
    } else {
      this.logger.debug('Danmaku not found in db, fetching from server')
    }

    const danmaku = await match(data)
      .with(
        { meta: { provider: DanmakuSourceType.Bilibili } },
        async ({ meta }) => {
          const result = await this.bilibiliService.getDanmaku(
            meta.cid,
            meta.aid
          )
          const danmaku: BiliBiliDanmakuInsert = {
            provider: meta.provider,
            comments: result,
            commentCount: result.length,
            meta,
            episodeId,
            episodeTitle: meta.title,
            seasonId: meta.seasonId,
            seasonTitle: meta.seasonTitle,
            timeUpdated: Date.now(),
            version: 1 + (existingDanmaku?.version ?? 0),
            schemaVersion: CURRENT_SCHEMA_VERSION,
          }

          return danmaku
        }
      )
      .with(
        { meta: { provider: DanmakuSourceType.DanDanPlay } },
        async ({ meta, params }) => {
          const result = await this.danDanPlayService.getDanmaku(meta, params)
          const danmaku: DanDanPlayDanmakuInsert = {
            provider: meta.provider,
            comments: result.comments,
            commentCount: result.comments.length,
            meta: result.meta,
            episodeId,
            episodeTitle: result.meta.episodeTitle,
            seasonId: meta.animeId,
            seasonTitle: meta.animeTitle,
            params: result.params,
            timeUpdated: Date.now(),
            version: 1 + (existingDanmaku?.version ?? 0),
            schemaVersion: CURRENT_SCHEMA_VERSION,
          }

          return danmaku
        }
      )
      .with(
        { meta: { provider: DanmakuSourceType.Tencent } },
        async ({ meta }) => {
          const result = await this.tencentService.getDanmaku(meta.vid)
          const danmaku: TencentDanmakuInsert = {
            provider: meta.provider,
            comments: result,
            commentCount: result.length,
            meta: meta,
            episodeId,
            episodeTitle: meta.episodeTitle,
            seasonId: meta.cid,
            seasonTitle: meta.seasonTitle,
            timeUpdated: Date.now(),
            version: 1 + (existingDanmaku?.version ?? 0),
            schemaVersion: CURRENT_SCHEMA_VERSION,
          }

          return danmaku
        }
      )
      .exhaustive()

    if (existingDanmaku) {
      this.logger.debug('Updating existing danmaku entry')
      await this.ddpTable.update(existingDanmaku.id, danmaku)

      return {
        ...danmaku,
        id: existingDanmaku.id,
      }
    } else {
      this.logger.debug('Saving danmaku to db', { danmaku })
      const id = await this.ddpTable.put(danmaku)

      return {
        ...danmaku,
        id: id,
      }
    }
  }

  async delete(data: DanmakuDeleteDto) {
    return this.ddpTable.delete(data)
  }

  async insertCustom(data: CustomDanmakuCreateData[]) {
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
    return this.ddpTable.toArray()
  }

  /**
   * Get only the count and metadata of all danmaku in db
   */
  async getAllLite(provider?: DanmakuSourceType) {
    const cache: DanmakuLite[] = []

    const collection = provider
      ? this.ddpTable.where({ provider })
      : this.ddpTable

    await collection.each((item) => {
      const { comments: _, ...rest } = item

      cache.push(rest)
    })

    return cache
  }

  async getOne(data: DanmakuGetOneDto) {
    return this.ddpTable.get(data)
  }

  async getOneLite(data: DanmakuGetOneDto) {
    const res = await this.ddpTable.get(data)

    if (res) {
      const { comments: _, ...rest } = res
      return rest satisfies DanmakuLite
    }

    return undefined
  }

  async getMany(data: DanmakuGetManyDto) {
    const res = await this.ddpTable.bulkGet(data)
    return res.filter((r) => r !== undefined)
  }

  async getByAnimeId(data: DanmakuGetBySeasonDto) {
    return this.ddpTable
      .filter((d) => {
        if (isDanmakuProvider(d, DanmakuSourceType.DanDanPlay)) {
          return d.meta.animeId === data.id
        }
        return false
      })
      .toArray()
  }

  async deleteAll() {
    await this.ddpTable.clear()
  }

  async purgeOlderThan(days: number) {
    if (days <= 0) return 0

    const now = Date.now()
    const threshold = now - days * 24 * 60 * 60 * 1000

    // delete danmaku older than threshold, ignoring custom danmaku
    const deleteCount = await this.ddpTable
      .where('timeUpdated')
      .below(threshold)
      .and((d) => d.provider !== DanmakuSourceType.Custom)
      .delete()

    this.logger.log(
      `Purged ${deleteCount} danmaku older than ${new Date(threshold).toLocaleString()}`
    )

    return deleteCount
  }
}
