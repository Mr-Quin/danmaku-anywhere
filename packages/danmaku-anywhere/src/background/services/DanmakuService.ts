import {
  type BackupParseResult,
  type CommentEntity,
  type CustomEpisode,
  type CustomEpisodeInsert,
  type CustomEpisodeLite,
  EPISODE_SCHEMA_VERSION,
  type Episode,
  type EpisodeInsert,
  type EpisodeLite,
  parseBackupMany,
  type WithSeason,
  zCombinedDanmaku,
} from '@danmaku-anywhere/danmaku-converter'
import type { SeasonService } from '@/background/services/SeasonService'
import type {
  CustomEpisodeQueryFilter,
  DanmakuImportData,
  DanmakuImportResult,
  EpisodeQueryFilter,
} from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { db } from '@/common/db/db'
import { Logger } from '@/common/Logger'
import type { DbEntity } from '@/common/types/dbEntity'
import { invariant, isServiceWorker, tryCatch } from '@/common/utils/utils'

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

  async filterCustom(
    filter: CustomEpisodeQueryFilter
  ): Promise<CustomEpisode[]> {
    if (filter.all) {
      return this.customTable.toArray()
    }
    if (filter.ids) {
      const res = await this.customTable.bulkGet(filter.ids)
      return res.filter((item) => item !== undefined)
    }
    return this.customTable.where(filter).toArray()
  }

  async filterCustomLite(
    filter: CustomEpisodeQueryFilter
  ): Promise<CustomEpisodeLite[]> {
    const episodes = await this.filterCustom(filter)
    return episodes.map((episode) => {
      const { comments: _, ...rest } = episode
      return rest
    })
  }

  async deleteCustom(filter: CustomEpisodeQueryFilter) {
    if (filter.all) {
      await this.customTable.clear()
      return
    }
    if (filter.ids) {
      await this.customTable.bulkDelete(filter.ids)
      return
    }
    await this.customTable.where(filter).delete()
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
      return (await this.update({ ...existing, ...data })) as DbEntity<T>
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

  async filterLite(
    filter: EpisodeQueryFilter
  ): Promise<WithSeason<EpisodeLite>[]> {
    const res = await this.filter(filter)

    return res.map((item) => {
      const { comments: _, ...rest } = item
      return rest
    })
  }

  async filter(filter: EpisodeQueryFilter): Promise<WithSeason<Episode>[]> {
    if (filter.all) {
      const res = await this.ddpTable.toArray()
      return Promise.all(res.map(this.joinSeason))
    }

    if (filter.ids) {
      const getMany = async (ids: number[]): Promise<WithSeason<Episode>[]> => {
        const res = await this.ddpTable.bulkGet(ids)
        const filtered = res.filter((r) => r !== undefined)
        return Promise.all(filtered.map(this.joinSeason))
      }
      return getMany(filter.ids)
    }

    const res = await this.ddpTable.where(filter).toArray()

    return Promise.all(
      res
        .toSorted((a, b) => a.indexedId.localeCompare(b.indexedId))
        .map(this.joinSeason)
    )
  }

  async delete(filter: EpisodeQueryFilter) {
    if (filter.all) {
      // don't delete everything at once
      return
    }
    if (filter.ids) {
      await this.ddpTable.bulkDelete(filter.ids)
      return
    }
    await this.ddpTable.where(filter).delete()
  }

  async import(importData: DanmakuImportData[]): Promise<DanmakuImportResult> {
    const importCustom = async (importData: {
      title: string
      comments: CommentEntity[]
    }): Promise<CustomEpisode> => {
      return this.addCustom({
        provider: DanmakuSourceType.Custom,
        comments: importData.comments,
        commentCount: importData.comments.length,
        title: importData.title,
        schemaVersion: EPISODE_SCHEMA_VERSION,
      })
    }

    const importBackup = async (data: BackupParseResult) => {
      let skipped = data.skipped.length
      const imported = []

      for (const [i, item] of data.parsed) {
        try {
          if (item.type === 'Custom') {
            await this.addCustom(item.episode)
            imported.push({
              type: DanmakuSourceType.Custom,
              title: item.episode.title,
              seasonId: -1,
              seasonTitle: 'Custom',
            })
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
            imported.push({
              type: item.season.provider,
              title: item.episode.title,
              seasonId: existingSeason.id,
              seasonTitle: existingSeason.title,
            })
          }
        } catch (e) {
          this.logger.error(`Failed to import backup item ${i}`, e)
          skipped += 1
        }
      }

      const grouped = Object.groupBy(
        imported,
        (item) => item.seasonTitle
      ) as Record<
        string,
        {
          type: DanmakuSourceType
          title: string
          seasonId: number
          seasonTitle: string
        }[]
      >

      return {
        skipped,
        imported: grouped,
      }
    }

    const results: DanmakuImportResult = {
      success: [],
      error: [],
    }

    for (const { title, data } of importData) {
      const [, err] = await tryCatch(async () => {
        // aggregate errors
        const errors: unknown[] = []

        // 1. parse as custom
        const customParse = zCombinedDanmaku.safeParse(data)

        if (customParse.success) {
          await importCustom({
            comments: customParse.data,
            title,
          })
          results.success.push({
            title,
            type: 'Custom',
          })
          return
        }
        errors.push(customParse.error)

        // 2. parse as backup
        const backupParseResult = parseBackupMany(
          Array.isArray(data) ? data : [data]
        )

        if (backupParseResult.parsed.length > 0) {
          const importResult = await importBackup(backupParseResult)

          results.success.push({
            title,
            type: 'Backup',
            result: importResult,
          })
          return
        }

        // 3. unable to import, return aggregated errors
        errors.push(backupParseResult.skipped)

        results.error.push({
          title,
          message: JSON.stringify(errors, null, 2),
        })
        return
      })
      if (err) {
        results.error.push({
          title,
          message: err.message,
        })
      }
    }

    return results
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
