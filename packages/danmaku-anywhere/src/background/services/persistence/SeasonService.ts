import type { Season, SeasonInsert } from '@danmaku-anywhere/danmaku-converter'
import { injectable } from 'inversify'
import type { SeasonQueryFilter } from '@/common/anime/dto'
import type { RemoteDanmakuSourceType } from '@/common/danmaku/enums'
import { isProvider } from '@/common/danmaku/utils'
import { db } from '@/common/db/db'
import { SeasonMap } from '@/common/seasonMap/SeasonMap'
import type { DbEntity } from '@/common/types/dbEntity'

@injectable()
export class SeasonService {
  async bulkUpsert<T extends SeasonInsert>(data: T[]): Promise<DbEntity<T>[]> {
    const results: DbEntity<T>[] = []

    for (const item of data) {
      results.push(await this.upsert(item))
    }

    return results
  }

  async upsert<T extends SeasonInsert>(data: T): Promise<DbEntity<T>> {
    const existing = await db.season.get({
      providerConfigId: data.providerConfigId,
      indexedId: data.indexedId,
    })
    if (existing) {
      const toInsert = {
        ...existing,
        ...data,
        timeUpdated: Date.now(),
        version: existing.version + 1,
      }
      await db.season.update(existing.id, toInsert)
      return toInsert
    }

    const toInsert = {
      ...data,
      timeUpdated: Date.now(),
      version: 1,
    }
    const id = await db.season.add(toInsert)
    return {
      ...toInsert,
      id,
    }
  }

  async mustGetById(id: number): Promise<Season> {
    const result = await db.season.get(id)
    if (!result) {
      throw new Error(`No season found for id ${id}`)
    }
    return result
  }

  async getById(id: number): Promise<Season | undefined> {
    return db.season.get(id)
  }

  async getByType<T extends RemoteDanmakuSourceType>(
    id: number,
    expectedType: T
  ): Promise<Extract<Season, { provider: T }>> {
    const season = await this.mustGetById(id)

    if (!isProvider(season, expectedType)) {
      throw new Error(
        `Type mismatch getting season: Expected ${expectedType}, got ${season.provider}`
      )
    }

    return season as Extract<Season, { provider: T }>
  }

  async getAll() {
    const seasons: Season[] = []

    await db.transaction('r', db.season, db.episode, async () => {
      const allSeasons = await db.season.toArray()

      for (const season of allSeasons) {
        const episodeCount = await db.episode
          .where({ seasonId: season.id })
          .count()
        if (episodeCount > 0) {
          seasons.push({
            ...season,
            localEpisodeCount: episodeCount,
          })
        }
      }
    })

    return seasons
  }

  async filter(filter: SeasonQueryFilter): Promise<Season[]> {
    return db.season.where(filter).toArray()
  }

  async delete(filter: SeasonQueryFilter): Promise<void> {
    if (filter.id === undefined)
      throw new Error('id must be provided for delete operation')
    const id = filter.id
    await db.transaction(
      'rw',
      db.episode,
      db.season,
      db.seasonMap,
      async () => {
        await db.episode
          .where({
            seasonId: id,
          })
          .delete()
        await db.season.delete(id)
        await db.seasonMap
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
