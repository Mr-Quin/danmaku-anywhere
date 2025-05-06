import type { SeasonService } from '@/background/services/SeasonService'
import { Logger } from '@/common/Logger'
import type {
  CustomDanmakuImportData,
  CustomDanmakuImportResult,
  EpisodeQueryFilter,
  ImportError,
} from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { db } from '@/common/db/db'
import type { DbEntity } from '@/common/types/dbEntity'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import {
  type CustomEpisode,
  type CustomEpisodeInsert,
  EPISODE_SCHEMA_VERSION,
  type Episode,
  type EpisodeInsert,
  type EpisodeLite,
  type WithSeason,
  parseBackup,
  parseCustomDanmaku,
} from '@danmaku-anywhere/danmaku-converter'

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

  async addCustom(data: CustomEpisodeInsert): Promise<CustomEpisode> {
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

  async importCustom(
    importData: CustomDanmakuImportData[]
  ): Promise<CustomDanmakuImportResult> {
    const commentsData = importData.map((d) => d.comments)
    const results = parseCustomDanmaku(commentsData)

    const errors: ImportError[] = []
    const succeeded: string[] = []

    results.skipped.forEach(([i, err]) => {
      errors.push({
        title: importData[i].title,
        index: i,
        error: err.message,
      })
    })

    for (const [i, comments] of results.imported) {
      const originalData = importData[i]
      try {
        await this.addCustom({
          provider: DanmakuSourceType.Custom,
          comments,
          commentCount: comments.length,
          title: originalData.title,
          schemaVersion: EPISODE_SCHEMA_VERSION,
        })
        succeeded.push(originalData.title)
      } catch (e) {
        errors.push({
          title: originalData.title,
          index: i,
          error: (e as Error).message,
        })
      }
    }

    return {
      succeeded,
      errors,
    }
  }

  async bulkUpsert(data: EpisodeInsert[]): Promise<Episode[]> {
    const results: Episode[] = []
    for (const item of data) {
      results.push(await this.upsert(item))
    }
    return results
  }

  async upsert<T extends EpisodeInsert>(data: T): Promise<DbEntity<T>> {
    const existing = await this.ddpTable.get({
      provider: data.provider,
      indexedId: data.indexedId,
    })

    if (existing) {
      return (await this.update(existing)) as DbEntity<T>
    }

    return this.add(data)
  }

  async add<T extends EpisodeInsert>(data: T): Promise<DbEntity<T>> {
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

  async update<T extends Episode>(data: T): Promise<T> {
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
  private joinSeason = async <T extends EpisodeLite>(
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
  async getAll(): Promise<WithSeason<Episode>[]> {
    const res = await this.ddpTable.toArray()
    return Promise.all(res.map(this.joinSeason))
  }

  /**
   * Get only the count and metadata of all danmaku in db
   */
  async getAllLite(
    provider?: DanmakuSourceType
  ): Promise<WithSeason<EpisodeLite>[]> {
    const cache: EpisodeLite[] = []

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
  ): Promise<WithSeason<Episode> | undefined> {
    const res = await this.ddpTable.get(filter)

    if (res) {
      return this.joinSeason(res)
    }

    return undefined
  }

  async getOneLite(
    filter: EpisodeQueryFilter
  ): Promise<WithSeason<EpisodeLite> | undefined> {
    const res = await this.ddpTable.get(filter)

    if (res) {
      const { comments: _, ...rest } = await this.joinSeason(res)
      return rest
    }

    return undefined
  }

  async getMany(ids: number[]): Promise<WithSeason<Episode>[]> {
    const res = await this.ddpTable.bulkGet(ids)
    const filtered = res.filter((r) => r !== undefined)
    return Promise.all(filtered.map(this.joinSeason))
  }

  async filter(filter: EpisodeQueryFilter): Promise<WithSeason<Episode>[]> {
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

  async importBackup(data: unknown[]) {
    const results = parseBackup(data)

    const skipped = results.skipped

    for (const [i, item] of results.imported) {
      try {
        if (item.type === 'Custom') {
          await this.addCustom(item.episode)
        } else {
          let [existingSeason] = await this.seasonService.filter({
            provider: item.season.provider,
            indexedId: item.season.indexedId,
          })
          // if the season does not exist, add it
          if (!existingSeason) {
            existingSeason = await this.seasonService.upsert(item.season)
          }
          await this.upsert({
            ...item.episode,
            seasonId: existingSeason.id,
          })
        }
      } catch (e) {
        this.logger.error(`Failed to import backup item ${i}`, e)
        skipped.push(i)
      }
    }

    return skipped.toSorted()
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
