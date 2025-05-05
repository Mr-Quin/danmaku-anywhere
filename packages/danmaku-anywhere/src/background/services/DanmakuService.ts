import { SeasonService } from '@/background/services/SeasonService'
import { Logger } from '@/common/Logger'
import type { EpisodeQueryFilter } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import {
  CustomEpisodeInsertV4,
  CustomEpisodeV4,
  EpisodeInsertV4,
  EpisodeLiteV4,
  EpisodeV4,
  WithSeason,
} from '@/common/danmaku/types/v4/schema'
import { db } from '@/common/db/db'
import { DbEntity } from '@/common/types/dbEntity'
import { invariant, isServiceWorker } from '@/common/utils/utils'

export class DanmakuService {
  private logger: typeof Logger

  constructor(
    private seasonService: SeasonService,
    private ddpTable: typeof db.episode,
    private customTable: typeof db.customEpisode
  ) {
    invariant(
      isServiceWorker(),
      'DanmakuService is only available in service worker'
    )
    this.logger = Logger.sub('[DanmakuService]')
  }

  async addCustom(data: CustomEpisodeInsertV4): Promise<CustomEpisodeV4> {
    const toAdd = {
      ...data,
      timeUpdated: Date.now(),
      version: 1,
    }
    const id = await this.customTable.add(toAdd)

    return {
      id,
      ...toAdd,
    }
  }

  async bulkAddCustom(
    data: CustomEpisodeInsertV4[]
  ): Promise<CustomEpisodeV4[]> {
    const results: CustomEpisodeV4[] = []
    for (const item of data) {
      results.push(await this.addCustom(item))
    }
    return results
  }

  async bulkUpsert(data: EpisodeInsertV4[]): Promise<EpisodeV4[]> {
    const results: EpisodeV4[] = []
    for (const item of data) {
      results.push(await this.upsert(item))
    }
    return results
  }

  async upsert<T extends EpisodeInsertV4>(data: T): Promise<DbEntity<T>> {
    const existing = await this.ddpTable.get({
      provider: data.provider,
      indexedId: data.indexedId,
    })

    if (existing) {
      return (await this.update(existing)) as DbEntity<T>
    }

    return this.add(data)
  }

  async add<T extends EpisodeInsertV4>(data: T): Promise<DbEntity<T>> {
    const toInsert = {
      ...data,
      timeUpdated: Date.now(),
      version: 1,
    }
    const id = await this.ddpTable.add(toInsert)

    return {
      ...toInsert,
      id,
    }
  }

  async update<T extends EpisodeV4>(data: T): Promise<T> {
    const toUpdate: T = {
      ...data,
      timeUpdated: Date.now(),
      version: data.version + 1,
    }

    await this.ddpTable.update(data.id, toUpdate as Omit<T, 'id'>)

    return toUpdate
  }

  /**
   * This is an arrow function so that the "this" keyword is bound to the class instance
   */
  private joinSeason = async <T extends EpisodeLiteV4>(
    episode: T
  ): Promise<WithSeason<T>> => {
    const season = await this.seasonService.mustGetById(episode.seasonId)

    return {
      ...episode,
      season,
    } as WithSeason<T>
  }

  /**
   * Avoid using this method because it will load all danmaku from db at once
   * which may cause performance issues or even crash when there are too many danmaku in db
   */
  async getAll(): Promise<WithSeason<EpisodeV4>[]> {
    const res = await this.ddpTable.toArray()
    return Promise.all(res.map(this.joinSeason))
  }

  /**
   * Get only the count and metadata of all danmaku in db
   */
  async getAllLite(
    provider?: DanmakuSourceType
  ): Promise<WithSeason<EpisodeLiteV4>[]> {
    const cache: EpisodeLiteV4[] = []

    const collection = provider
      ? this.ddpTable.where({ provider })
      : this.ddpTable

    await collection.each((item) => {
      const { comments: _, ...rest } = item

      cache.push(rest)
    })

    return Promise.all(cache.map(this.joinSeason))
  }

  async getOne(
    filter: EpisodeQueryFilter
  ): Promise<WithSeason<EpisodeV4> | undefined> {
    const res = await this.ddpTable.get(filter)

    if (res) {
      return this.joinSeason(res)
    }

    return undefined
  }

  async getOneLite(
    filter: EpisodeQueryFilter
  ): Promise<WithSeason<EpisodeLiteV4> | undefined> {
    const res = await this.ddpTable.get(filter)

    if (res) {
      const { comments: _, ...rest } = await this.joinSeason(res)
      return rest
    }

    return undefined
  }

  async getMany(ids: number[]): Promise<WithSeason<EpisodeV4>[]> {
    const res = await this.ddpTable.bulkGet(ids)
    const filtered = res.filter((r) => r !== undefined)
    return Promise.all(filtered.map(this.joinSeason))
  }

  async filter(filter: EpisodeQueryFilter): Promise<WithSeason<EpisodeV4>[]> {
    const res = await this.ddpTable.where(filter).toArray()
    return Promise.all(
      res
        .toSorted((a, b) => a.indexedId.localeCompare(b.indexedId))
        .map(this.joinSeason)
    )
  }

  async delete(filter: EpisodeQueryFilter) {
    return this.ddpTable.where(filter).delete()
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
      .delete()

    this.logger.log(
      `Purged ${deleteCount} danmaku older than ${new Date(threshold).toLocaleString()}`
    )

    return deleteCount
  }
}
