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
import { Dexie } from 'dexie'
import type {
  CustomEpisodeQueryFilter,
  DanmakuImportData,
  DanmakuImportResult,
  EpisodeQueryFilter,
} from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { db } from '@/common/db/db'
import { Logger } from '@/common/Logger'
import type { DbEntity } from '@/common/types/dbEntity'
import { invariant, isServiceWorker, tryCatch } from '@/common/utils/utils'

export class DanmakuService {
  private logger: typeof Logger

  constructor(private seasonService: SeasonService) {
    invariant(
      isServiceWorker(),
      'DanmakuService is only available in service worker'
    )
    this.logger = Logger.sub('[DanmakuService]')
  }

  // ---- Comment blob helpers ----
  private async gzipComments(comments: CommentEntity[]): Promise<Blob> {
    try {
      const json = JSON.stringify(comments)
      const input = new Blob([json], { type: 'application/json' })
      // @ts-ignore CompressionStream is available in extension SW/runtime
      const cs = new CompressionStream('gzip')
      const stream = input.stream().pipeThrough(cs)
      const buffer = await new Response(stream).arrayBuffer()
      return new Blob([buffer], { type: 'application/gzip' })
    } catch (_e) {
      return new Blob([JSON.stringify(comments)], { type: 'application/json' })
    }
  }

  private async gunzipComments(blob: Blob): Promise<CommentEntity[]> {
    try {
      if (blob.type === 'application/gzip') {
        // @ts-ignore DecompressionStream is available in extension SW/runtime
        const ds = new DecompressionStream('gzip')
        const stream = blob.stream().pipeThrough(ds)
        const text = await new Response(stream).text()
        return JSON.parse(text) as CommentEntity[]
      }
      const text = await blob.text()
      return JSON.parse(text) as CommentEntity[]
    } catch (_e) {
      return []
    }
  }

  private async saveComments(comments: CommentEntity[]): Promise<number> {
    const blob = await this.gzipComments(comments)
    const id = await db.danmakuData.add({ blob })
    return id
  }

  private async loadComments(refId: number | undefined): Promise<CommentEntity[]> {
    if (refId === undefined) return []
    const row = await db.danmakuData.get(refId)
    if (!row) return []
    return this.gunzipComments(row.blob)
  }

  private async withinRw<T>(tables: Dexie.Table<any, any>[], fn: () => Promise<T>) {
    // @ts-ignore Dexie.currentTransaction exists at runtime
    if (Dexie.currentTransaction) {
      return fn()
    }
    return db.transaction('rw', ...tables, fn)
  }

  async addCustom(data: CustomEpisodeInsert): Promise<CustomEpisode> {
    return this.withinRw([db.customEpisode, db.danmakuData], async () => {
      const commentsRefId = await this.saveComments(data.comments)
      const toAdd = {
        ...data,
        comments: undefined as unknown as CommentEntity[],
        commentsRefId,
        timeUpdated: Date.now(),
        version: 1,
      }
      const id = await db.customEpisode.add(toAdd as any)
      return {
        id,
        ...(toAdd as any),
        comments: data.comments,
      } as CustomEpisode
    })
  }

  async importCustom(importData: {
    title: string
    comments: CommentEntity[]
  }): Promise<CustomEpisode> {
    return this.addCustom({
      provider: DanmakuSourceType.MacCMS,
      comments: importData.comments,
      commentCount: importData.comments.length,
      title: importData.title,
      schemaVersion: EPISODE_SCHEMA_VERSION,
    })
  }

  async filterCustom(
    filter: CustomEpisodeQueryFilter
  ): Promise<CustomEpisode[]> {
    const loadAll = async (rows: any[]) => {
      return Promise.all(
        rows.map(async (row) => ({
          ...(row as any),
          comments: await this.loadComments(row.commentsRefId),
        }))
      )
    }
    if (filter.all) {
      const rows = await db.customEpisode.toArray()
      return loadAll(rows)
    }
    if (filter.ids) {
      const res = await db.customEpisode.bulkGet(filter.ids)
      const filtered = res.filter((item) => item !== undefined) as any[]
      return loadAll(filtered)
    }
    const rows = await db.customEpisode.where(filter as any).toArray()
    return loadAll(rows)
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
    const row: any = await db.customEpisode.where('title').equals(title).first()
    if (!row) return undefined
    return {
      ...(row as any),
      comments: await this.loadComments(row.commentsRefId),
    }
  }

  async deleteCustom(filter: CustomEpisodeQueryFilter) {
    await this.withinRw([db.customEpisode, db.danmakuData], async () => {
      if (filter.all) {
        const rows = await db.customEpisode.toArray()
        const refIds = rows
          .map((r: any) => r.commentsRefId)
          .filter((v: any) => v !== undefined)
        if (refIds.length) await db.danmakuData.bulkDelete(refIds)
        await db.customEpisode.clear()
        return
      }
      if (filter.ids) {
        const rows = await db.customEpisode.bulkGet(filter.ids)
        const refIds = rows
          .filter((r): r is any => !!r)
          .map((r: any) => r.commentsRefId)
          .filter((v: any) => v !== undefined)
        if (refIds.length) await db.danmakuData.bulkDelete(refIds)
        await db.customEpisode.bulkDelete(filter.ids)
        return
      }
      const rows = await db.customEpisode.where(filter as any).toArray()
      const refIds = rows
        .map((r: any) => r.commentsRefId)
        .filter((v: any) => v !== undefined)
      if (refIds.length) await db.danmakuData.bulkDelete(refIds)
      await db.customEpisode.where(filter as any).delete()
    })
  }

  async bulkUpsert(data: EpisodeInsert[]): Promise<Episode[]> {
    const results: Episode[] = []
    for (const item of data) {
      results.push(await this.upsert(item))
    }
    return results
  }

  async upsert<T extends EpisodeInsert>(data: T): Promise<DbEntity<T>> {
    const existing: any = await db.episode.get({
      provider: data.provider,
      indexedId: data.indexedId,
    })

    if (existing) {
      const merged: any = { ...existing, ...data }
      return (await this.update(merged)) as DbEntity<T>
    }

    return this.add(data)
  }

  async add<T extends EpisodeInsert>(data: T): Promise<DbEntity<T>> {
    return this.withinRw([db.episode, db.danmakuData], async () => {
      const commentsRefId = await this.saveComments(data.comments)
      const toInsert: any = {
        ...data,
        comments: undefined,
        commentsRefId,
        timeUpdated: Date.now(),
        version: 1,
      }
      const id = await db.episode.add(toInsert)
      return {
        ...(toInsert as T),
        id,
        comments: data.comments,
      } as unknown as DbEntity<T>
    })
  }

  async update<T extends Episode>(data: T): Promise<T> {
    return this.withinRw([db.episode, db.danmakuData], async () => {
      const existing: any = await db.episode.get(data.id)
      let commentsRefId: number | undefined = existing?.commentsRefId

      if (Array.isArray((data as any).comments)) {
        const blob = await this.gzipComments((data as any).comments)
        if (commentsRefId !== undefined) {
          await db.danmakuData.update(commentsRefId, { blob })
        } else {
          commentsRefId = await db.danmakuData.add({ blob })
        }
      }

      const toUpdateDb: any = {
        ...(data as any),
        comments: undefined,
        commentsRefId,
        timeUpdated: Date.now(),
        version: data.version + 1,
      }
      await db.episode.update(data.id, toUpdateDb)
      return {
        ...(toUpdateDb as T),
        comments: (data as any).comments ?? (await this.loadComments(commentsRefId)),
      } as T
    })
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
      const res: any[] = await db.episode.toArray()
      const withComments: any[] = await Promise.all(
        res.map(async (r) => ({
          ...r,
          comments: await this.loadComments(r.commentsRefId),
        }))
      )
      return Promise.all(withComments.map(this.joinSeason as any))
    }

    if (filter.ids) {
      const res = await db.episode.bulkGet(filter.ids)
      const filtered: any[] = res.filter((r) => r !== undefined) as any[]
      const withComments: any[] = await Promise.all(
        filtered.map(async (r) => ({
          ...r,
          comments: await this.loadComments(r.commentsRefId),
        }))
      )
      return Promise.all(withComments.map(this.joinSeason as any))
    }

    const res: any[] = await db.episode.where(filter as any).toArray()
    const withComments: any[] = await Promise.all(
      res.map(async (r) => ({
        ...r,
        comments: await this.loadComments(r.commentsRefId),
      }))
    )
    return Promise.all(
      withComments
        .toSorted((a, b) => a.indexedId.localeCompare(b.indexedId))
        .map(this.joinSeason as any)
    )
  }

  async delete(filter: EpisodeQueryFilter) {
    await this.withinRw([db.episode, db.danmakuData], async () => {
      if (filter.all) {
        return
      }
      if (filter.ids) {
        const rows = await db.episode.bulkGet(filter.ids)
        const refIds = rows
          .filter((r): r is any => !!r)
          .map((r: any) => r.commentsRefId)
          .filter((v: any) => v !== undefined)
        if (refIds.length) await db.danmakuData.bulkDelete(refIds)
        await db.episode.bulkDelete(filter.ids)
        return
      }
      const rows = await db.episode.where(filter as any).toArray()
      const refIds = rows
        .map((r: any) => r.commentsRefId)
        .filter((v: any) => v !== undefined)
      if (refIds.length) await db.danmakuData.bulkDelete(refIds)
      await db.episode.where(filter as any).delete()
    })
  }

  async import(importData: DanmakuImportData[]): Promise<DanmakuImportResult> {
    const importBackup = async (data: BackupParseResult) => {
      let skipped = data.skipped.length
      const imported = []

      for (const [i, item] of data.parsed) {
        try {
          if (item.type === 'Custom') {
            await this.addCustom(item.episode)
            imported.push({
              type: DanmakuSourceType.MacCMS,
              title: item.episode.title,
              seasonId: -1,
              seasonTitle: 'Custom',
            })
          } else {
            let savedSeasonId = -1
            let savedSeasonTitle = ''
            await db.transaction('rw', db.season, db.episode, db.danmakuData, async () => {
              let [existingSeason] = await this.seasonService.filter({
                provider: item.season.provider,
                indexedId: item.season.indexedId,
              })
              if (!existingSeason) {
                existingSeason = await this.seasonService.upsert(item.season)
              }
              savedSeasonId = existingSeason.id
              savedSeasonTitle = existingSeason.title

              await this.upsert({
                ...item.episode,
                seasonId: existingSeason.id,
              })
            })
            imported.push({
              type: item.season.provider,
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
    const deleteCount = await this.withinRw([db.episode, db.danmakuData], async () => {
      const oldEpisodes: any[] = await db.episode
        .where('timeUpdated')
        .below(threshold)
        .toArray()
      const refIds = oldEpisodes
        .map((r) => r.commentsRefId)
        .filter((v) => v !== undefined)
      if (refIds.length) await db.danmakuData.bulkDelete(refIds)
      await db.episode.where('timeUpdated').below(threshold).delete()
      return oldEpisodes.length
    })

    this.logger.log(
      `Purged ${deleteCount} danmaku older than ${new Date(threshold).toLocaleString()}`
    )

    return deleteCount
  }
}
