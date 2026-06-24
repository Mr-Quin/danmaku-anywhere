import type { UDanmaku } from '@dan-uni/dan-any/core'
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
  type Season,
  type WithSeason,
  zCombinedDanmaku,
} from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import type { ChunkService } from '@/background/services/persistence/ChunkService'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import type { UniDBService } from '@/background/services/UniDBService'
import type {
  CustomEpisodeQueryFilter,
  DanmakuImportData,
  DanmakuImportResult,
  EpisodeQueryFilter,
} from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { DanmakuAnywhereDb } from '@/common/db/db'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { DbEntity } from '@/common/types/dbEntity'
import { tryCatch } from '@/common/utils/tryCatch'
import { invariant, isServiceWorker } from '@/common/utils/utils'
import { matchPathByName } from './utils/matchPathByName'

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

  async get(id: number): Promise<Episode | undefined> {
    return this.db.episode.get(id)
  }

  async getCustom(id: number): Promise<CustomEpisode | undefined> {
    return this.db.customEpisode.get(id)
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
    // V5: Must create chunk, no longer store comments array
    // This is a temporary bridge for backward compatibility
    throw new Error(
      'importCustom is deprecated. Use importCustomFromChunk instead.'
    )
  }

  async importCustomFromChunk(
    importData: {
      title: string
      danmakus: Record<string, unknown>[]
    },
    deps: {
      chunkService: ChunkService
      uniDBService: UniDBService
    }
  ): Promise<CustomEpisode> {
    // Deserialize danmakus: convert ISO date strings back to Date objects
    const deserializedDanmakus: UDanmaku[] = importData.danmakus.map((d) => ({
      ...d,
      ctime:
        typeof d.ctime === 'string' ? new Date(d.ctime) : (d.ctime as Date),
    })) as UDanmaku[]

    // Create a UniChunk and populate it with the danmakus
    const udb = await deps.uniDBService.getUniDB()
    const chunk = await udb.makeChunk({})

    // Import danmakus into chunk
    if (deserializedDanmakus.length > 0) {
      await chunk.upsertDanmakus(deserializedDanmakus)
    }

    // Save chunk and get ID
    const chunkId = await deps.chunkService.saveChunk(chunk)

    // V5: Only store chunkId, no comments array
    return this.addCustom({
      provider: DanmakuSourceType.MacCMS,
      commentsChunkId: chunkId,
      commentCount: deserializedDanmakus.length,
      title: importData.title,
      schemaVersion: EPISODE_SCHEMA_VERSION,
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
    // V5: CustomEpisodeLite and CustomEpisode are the same (no comments field to remove)
    return this.filterCustom(filter)
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

  async deleteCustom(
    filter: CustomEpisodeQueryFilter,
    chunkService?: ChunkService
  ) {
    // Get chunkIds before deletion
    let chunkIds: number[] = []
    if (chunkService) {
      const episodes = await this.filterCustom(filter)
      chunkIds = episodes
        .map((e) => e.commentsChunkId)
        .filter((id): id is number => id != null && id !== 0)
    }

    // Delete episodes
    if (filter.all) {
      await this.db.customEpisode.clear()
    } else if (filter.ids) {
      await this.db.customEpisode.bulkDelete(filter.ids)
    } else {
      await this.db.customEpisode.where(filter).delete()
    }

    // Delete associated chunks
    if (chunkService && chunkIds.length > 0) {
      await Promise.all(chunkIds.map((id) => chunkService.deleteChunk(id)))
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
          return (await this.update({ ...existing, ...data })) as DbEntity<T>
        }

        return this.add(data)
      }
    )
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
    // V5: EpisodeLite and Episode are the same (no comments field to remove)
    return this.filter(filter) as Promise<WithSeason<EpisodeLite>[]>
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

  async delete(filter: EpisodeQueryFilter, chunkService?: ChunkService) {
    if (filter.all) {
      // don't delete everything at once
      return
    }

    // Get chunkIds before deletion
    let chunkIds: number[] = []
    if (chunkService) {
      const episodes = await this.filter(filter)
      chunkIds = episodes
        .map((e) => e.commentsChunkId)
        .filter((id): id is number => id != null && id !== 0)
    }

    // Delete episodes
    if (filter.ids) {
      await this.db.episode.bulkDelete(filter.ids)
    } else {
      await this.db.episode.where(filter).delete()
    }

    // Delete associated chunks
    if (chunkService && chunkIds.length > 0) {
      await Promise.all(chunkIds.map((id) => chunkService.deleteChunk(id)))
    }
  }

  async import(
    importData: DanmakuImportData[],
    deps: {
      chunkService: ChunkService
      uniDBService: UniDBService
    }
  ): Promise<DanmakuImportResult> {
    const results: DanmakuImportResult = {
      success: [],
      error: [],
    }

    const _importBackup = async (data: BackupParseResult) => {
      // V5 migration: Backup import needs complete refactoring to support chunks
      // TODO: Convert backup episodes (v4 format with comments array) to v5 (chunks)
      throw new Error(
        'Backup import is temporarily disabled during v5 migration. ' +
          'Please use file import instead (.xml, .bin, .json files).'
      )
    }

    for (const item of importData) {
      const [, err] = await tryCatch(async () => {
        // New format: danmakus are already parsed as UDanmaku[]
        if ('danmakus' in item && Array.isArray(item.danmakus)) {
          await this.importCustomFromChunk(
            {
              title: item.title,
              danmakus: item.danmakus,
            },
            deps
          )
          results.success.push({
            title: item.title,
            type: 'Custom',
          })
          return
        }

        // Fallback: old format with 'data' field (for backward compatibility during transition)
        if ('data' in item) {
          const { title, data } = item as any
          const errors: unknown[] = []

          // 1. parse as custom (old format with comments array)
          const customParse = zCombinedDanmaku.safeParse(data)

          if (customParse.success) {
            // Convert CommentEntity[] to UDanmaku[] using V4EpisodeAdapter
            const { V4EpisodeAdapter } = await import(
              '@danmaku-anywhere/danmaku-converter'
            )
            const udb = await deps.uniDBService.getUniDB()
            const chunk = await udb.makeChunk({})

            const adapter = V4EpisodeAdapter({
              comments: customParse.data,
              commentCount: customParse.data.length,
            } as any)

            await adapter(udb, chunk)
            const danmakus = await chunk.$danmakus

            // Serialize for RPC-like structure
            const serialized = danmakus.map((d: any) => ({
              ...d,
              ctime: d.ctime instanceof Date ? d.ctime.toISOString() : d.ctime,
            }))

            await this.importCustomFromChunk(
              {
                title,
                danmakus: serialized,
              },
              deps
            )

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
            // V5: Backup import temporarily disabled
            results.error.push({
              title,
              message:
                'Backup import is temporarily disabled during v5 migration. ' +
                'Please use file import instead (.xml, .bin, .json files).',
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
        }
      })
      if (err) {
        results.error.push({
          title: item.title,
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
    const deleteCount = await this.db.episode
      .where('timeUpdated')
      .below(threshold)
      .delete()

    this.logger.log(
      `Purged ${deleteCount} danmaku older than ${new Date(threshold).toLocaleString()}`
    )

    return deleteCount
  }
}
