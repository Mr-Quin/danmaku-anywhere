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
  parseCommentEntityP,
  type Season,
  type WithSeason,
  zCombinedDanmaku,
} from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import type {
  CustomEpisodeQueryFilter,
  DanmakuImportData,
  DanmakuImportResult,
  EpisodeQueryFilter,
  KeptStored,
} from '@/common/danmaku/dto'
import { DanmakuAnywhereDb } from '@/common/db/db'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { DbEntity } from '@/common/types/dbEntity'
import { tryCatch } from '@/common/utils/tryCatch'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import { matchPathByName } from './utils/matchPathByName'

function countRenderable(comments: CommentEntity[]): number {
  return comments.filter((comment) => parseCommentEntityP(comment.p) !== null)
    .length
}

function hasSameComments(a: CommentEntity[], b: CommentEntity[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  return a.every((comment, i) => {
    const other = b[i]
    return (
      comment.p === other.p &&
      comment.m === other.m &&
      comment.s === other.s &&
      comment.cid === other.cid
    )
  })
}

@injectable('Singleton')
export class DanmakuService {
  private logger: ILogger

  constructor(
    @inject(SeasonService) private seasonService: SeasonService,
    @inject(DanmakuAnywhereDb) private db: DanmakuAnywhereDb,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    invariant(
      isServiceWorker(),
      'DanmakuService is only available in service worker'
    )
    this.logger = logger.sub('[DanmakuService]')
  }

  async addCustom(data: CustomEpisodeInsert): Promise<CustomEpisode> {
    const toAdd = {
      ...data,
      timeUpdated: Date.now(),
      version: 1,
    }
    const id = await this.db.customEpisode.add(toAdd)

    return {
      id,
      ...toAdd,
    }
  }

  async importCustom(importData: {
    title: string
    comments: CommentEntity[]
  }): Promise<CustomEpisode> {
    return this.addCustom({
      comments: importData.comments,
      commentCount: importData.comments.length,
      title: importData.title,
      schemaVersion: EPISODE_SCHEMA_VERSION,
    })
  }

  // A custom episode has no upstream id, so a file counts as already imported
  // when an episode with the same title (the file's path within the import)
  // holds the same comments. Files that only share a name, like two shows'
  // 01.xml, still import.
  private async hasCustomCopy(
    title: string,
    comments: CommentEntity[]
  ): Promise<boolean> {
    const sameTitle = await this.db.customEpisode
      .where('title')
      .equals(title)
      .toArray()
    return sameTitle.some((episode) => {
      return hasSameComments(episode.comments, comments)
    })
  }

  async filterCustom(
    filter: CustomEpisodeQueryFilter
  ): Promise<CustomEpisode[]> {
    if (filter.all) {
      return this.db.customEpisode.toArray()
    }
    if (filter.ids) {
      const res = await this.db.customEpisode.bulkGet(filter.ids)
      return res.filter((item) => item !== undefined)
    }
    return this.db.customEpisode.where(filter).toArray()
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

  async getCustomByTitle(title: string): Promise<CustomEpisode | undefined> {
    const normalized = title.startsWith('/') ? title : `/${title}`
    return this.db.customEpisode.get({ title: normalized })
  }

  async matchLocalByTitle(title: string): Promise<CustomEpisode | undefined> {
    // episode title can be a path, so we need to match it by comparing the last part
    const customEpisodesLite = await this.filterCustomLite({
      all: true,
    })
    const match = customEpisodesLite.find((episode) =>
      matchPathByName(title, episode.title)
    )
    if (!match) {
      return undefined
    }
    const customEpisodes = await this.filterCustom({
      ids: [match.id],
    })
    return customEpisodes[0]
  }

  async deleteCustom(filter: CustomEpisodeQueryFilter) {
    if (filter.all) {
      await this.db.customEpisode.clear()
      return
    }
    if (filter.ids) {
      await this.db.customEpisode.bulkDelete(filter.ids)
      return
    }
    await this.db.customEpisode.where(filter).delete()
  }

  async bulkUpsert(data: EpisodeInsert[]): Promise<Episode[]> {
    const results: Episode[] = []
    for (const item of data) {
      results.push(await this.upsert(item))
    }
    return results
  }

  async upsert<T extends EpisodeInsert>(data: T): Promise<DbEntity<T>> {
    return this.db.transaction(
      'rw',
      this.db.episode,
      this.db.season,
      async () => {
        const existing = await this.db.episode.get({
          seasonId: data.seasonId,
          indexedId: data.indexedId,
        })

        return this.replaceOrAdd(data, existing)
      }
    )
  }

  // The stored count is read inside the write transaction, so two fetches of
  // one episode racing each other cannot shrink it through a stale read.
  async upsertUnlessFewer(
    data: EpisodeInsert
  ): Promise<{ episode: Episode; keptStored?: KeptStored }> {
    return this.db.transaction(
      'rw',
      this.db.episode,
      this.db.season,
      async () => {
        const existing = await this.db.episode.get({
          seasonId: data.seasonId,
          indexedId: data.indexedId,
        })

        if (existing) {
          const fetchedCount = countRenderable(data.comments)
          const storedCount = countRenderable(existing.comments)
          if (fetchedCount < storedCount) {
            return {
              episode: existing,
              keptStored: { fetchedCount, storedCount },
            }
          }
        }

        return { episode: await this.replaceOrAdd(data, existing) }
      }
    )
  }

  private async replaceOrAdd<T extends EpisodeInsert>(
    data: T,
    existing: Episode | undefined
  ): Promise<DbEntity<T>> {
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

    const id = await this.db.transaction(
      'rw',
      this.db.episode,
      this.db.season,
      async () => {
        // check if the seasonId link is valid in a transaction context so the whole operation is atomic
        const season = await this.seasonService.getById(data.seasonId)

        if (!season) {
          this.logger.warn(
            `Season ${data.seasonId} not found when adding danmaku`,
            { seasonId: data.seasonId }
          )
          throw new Error(
            `Inserting episode failed: Season ${data.seasonId} not found`
          )
        }

        const id = await this.db.episode.add(toInsert)

        return id
      }
    )

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

    await this.db.episode.update(data.id, toUpdate as Omit<T, 'id'>)

    return toUpdate
  }

  // Filtering by seasonId — the common path — returns N episodes that
  // share one season, so a per-episode lookup reads the same row N times.
  private async joinSeasons<T extends EpisodeLite>(
    episodes: T[]
  ): Promise<WithSeason<T>[]> {
    if (episodes.length === 0) {
      return []
    }

    const uniqueIds = [...new Set(episodes.map((e) => e.seasonId))]
    const seasonRows = await this.db.season.bulkGet(uniqueIds)
    const seasonById = new Map<number, Season>()
    for (let i = 0; i < uniqueIds.length; i++) {
      const season = seasonRows[i]
      if (!season) {
        throw new Error(`No season found for id ${uniqueIds[i]}`)
      }
      seasonById.set(uniqueIds[i], season)
    }

    return episodes.map((episode) => ({
      ...episode,
      season: seasonById.get(episode.seasonId),
    })) as WithSeason<T>[]
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
      const res = await this.db.episode.toArray()
      return this.joinSeasons(res)
    }

    if (filter.ids) {
      const res = await this.db.episode.bulkGet(filter.ids)
      return this.joinSeasons(res.filter((r) => r !== undefined))
    }

    const res = await this.db.episode.where(filter).toArray()

    return this.joinSeasons(
      res.toSorted((a, b) => a.indexedId.localeCompare(b.indexedId))
    )
  }

  async delete(filter: EpisodeQueryFilter) {
    if (filter.all) {
      // don't delete everything at once
      return
    }
    if (filter.ids) {
      await this.db.episode.bulkDelete(filter.ids)
      return
    }
    await this.db.episode.where(filter).delete()
  }

  async import(importData: DanmakuImportData[]): Promise<DanmakuImportResult> {
    const results: DanmakuImportResult = {
      success: [],
      alreadyImported: [],
      error: [],
    }

    const importBackup = async (data: BackupParseResult) => {
      let skipped = data.skipped.length
      const imported = []

      for (const [i, item] of data.parsed) {
        try {
          if (item.type === 'Custom') {
            const { title, comments } = item.episode
            if (await this.hasCustomCopy(title, comments)) {
              results.alreadyImported.push({ title })
              continue
            }
            await this.addCustom(item.episode)
            results.success.push({
              title: item.episode.title,
              type: 'Custom',
            })
          } else {
            let savedSeasonId = -1
            let savedSeasonTitle = ''
            await this.db.transaction(
              'rw',
              this.db.season,
              this.db.episode,
              async () => {
                let existingSeason = await this.seasonService.findExisting(
                  item.season
                )
                if (!existingSeason) {
                  existingSeason = await this.seasonService.upsert(item.season)
                }
                savedSeasonId = existingSeason.id
                savedSeasonTitle = existingSeason.title

                await this.upsert({
                  ...item.episode,
                  seasonId: existingSeason.id,
                })
              }
            )
            imported.push({
              type: item.season.manifestId,
              title: item.episode.title,
              seasonId: savedSeasonId,
              seasonTitle: savedSeasonTitle,
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
          type: string
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

    for (const { title, data } of importData) {
      const [, err] = await tryCatch(async () => {
        // aggregate errors
        const errors: unknown[] = []

        // 1. parse as custom
        const customParse = zCombinedDanmaku.safeParse(data)

        if (customParse.success) {
          if (await this.hasCustomCopy(title, customParse.data)) {
            results.alreadyImported.push({ title })
            return
          }
          await this.importCustom({
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

          if (
            Object.keys(importResult.imported).length > 0 ||
            importResult.skipped > 0
          ) {
            results.success.push({
              title,
              type: 'Backup',
              result: importResult,
            })
          }
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

  private purgeableOlderThan(days: number) {
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000
    // custom episodes live in their own table and are never purged
    return {
      threshold,
      collection: this.db.episode.where('timeUpdated').below(threshold),
    }
  }

  async countOlderThan(days: number) {
    if (days <= 0) return 0
    return this.purgeableOlderThan(days).collection.count()
  }

  async purgeOlderThan(days: number) {
    if (days <= 0) return 0

    const { threshold, collection } = this.purgeableOlderThan(days)
    const deleteCount = await collection.delete()

    this.logger.log(
      `Purged ${deleteCount} episodes not updated since ${new Date(threshold).toLocaleString()}`
    )

    return deleteCount
  }
}
