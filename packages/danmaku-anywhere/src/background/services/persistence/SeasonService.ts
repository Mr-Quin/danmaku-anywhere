import type { Season, SeasonInsert } from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import type { SeasonGetAllRequest, SeasonQueryFilter } from '@/common/anime/dto'
import { DanmakuAnywhereDb } from '@/common/db/db'
import { SeasonMap } from '@/common/seasonMap/SeasonMap'
import type { DbEntity } from '@/common/types/dbEntity'

@injectable('Singleton')
export class SeasonService {
  constructor(@inject(DanmakuAnywhereDb) private db: DanmakuAnywhereDb) {}
  async bulkUpsert<T extends SeasonInsert>(data: T[]): Promise<DbEntity<T>[]> {
    const results: DbEntity<T>[] = []

    for (const item of data) {
      results.push(await this.upsert(item))
    }

    return results
  }

  async findExisting<T extends SeasonInsert>(
    data: T
  ): Promise<DbEntity<T> | undefined> {
    return this.db.season.get({
      namespaceKey: data.namespaceKey,
      indexedId: data.indexedId,
    }) as Promise<DbEntity<T> | undefined>
  }

  async upsert<T extends SeasonInsert>(data: T): Promise<DbEntity<T>> {
    return this.db.transaction('rw', this.db.season, async () => {
      const existing = await this.db.season.get({
        namespaceKey: data.namespaceKey,
        indexedId: data.indexedId,
      })
      if (existing) {
        const toInsert = {
          ...existing,
          ...data,
          timeUpdated: Date.now(),
          version: existing.version + 1,
        }
        await this.db.season.update(existing.id, toInsert)
        return toInsert
      }

      const toInsert = {
        ...data,
        timeUpdated: Date.now(),
        version: 1,
      }
      const id = await this.db.season.add(toInsert)
      return {
        ...toInsert,
        id,
      }
    })
  }

  async mustGetById(id: number): Promise<Season> {
    const result = await this.db.season.get(id)
    if (!result) {
      throw new Error(`No season found for id ${id}`)
    }
    return result
  }

  async getById(id: number): Promise<Season | undefined> {
    return this.db.season.get(id)
  }

  async getAll(options: SeasonGetAllRequest) {
    const seasons: Season[] = []

    await this.db.transaction(
      'r',
      this.db.season,
      this.db.episode,
      async () => {
        const allSeasons = await this.db.season.toArray()

        // Index-only cursor: walks the seasonId index without reading the
        // episode rows, so the heavy comments field (can be 30k+ entries
        // per row) is never deserialized.
        const counts = new Map<number, number>()
        await this.db.episode.orderBy('seasonId').eachKey((key) => {
          const seasonId = key as number
          counts.set(seasonId, (counts.get(seasonId) ?? 0) + 1)
        })

        for (const season of allSeasons) {
          const episodeCount = counts.get(season.id) ?? 0
          if (episodeCount > 0 || options.includeEmpty) {
            seasons.push({
              ...season,
              localEpisodeCount: episodeCount,
            })
          }
        }
      }
    )

    return seasons
  }

  async filter(filter: SeasonQueryFilter): Promise<Season[]> {
    if (filter.ids) {
      return this.db.season.where('id').anyOf(filter.ids).toArray()
    }
    return this.db.season.where(filter).toArray()
  }

  async delete(filter: SeasonQueryFilter): Promise<void> {
    if (filter.id === undefined)
      throw new Error('id must be provided for delete operation')
    const id = filter.id
    await this.db.transaction(
      'rw',
      this.db.episode,
      this.db.season,
      this.db.seasonMap,
      this.db.bookmark,
      async () => {
        await this.db.bookmark.where({ seasonId: id }).delete()
        await this.db.episode
          .where({
            seasonId: id,
          })
          .delete()
        await this.db.season.delete(id)
        await this.db.seasonMap
          .where('seasonIds')
          .equals(id)
          .modify((val) => {
            const updated = SeasonMap.fromSnapshot(val).withoutSeasonId(id)
            const snapshot = updated.toSnapshot()
            val.seasonIds = snapshot.seasonIds
            val.seasons = snapshot.seasons
          })
      }
    )
  }
}
