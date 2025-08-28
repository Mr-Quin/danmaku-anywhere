import type { Season, SeasonInsert } from '@danmaku-anywhere/danmaku-converter'
import type { SeasonQueryFilter } from '@/common/anime/dto'
import { db } from '@/common/db/db'
import type { DbEntity } from '@/common/types/dbEntity'

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
      provider: data.provider,
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

  async mustGetById(id: number) {
    const result = await db.season.get(id)
    if (!result) {
      throw new Error(`No season found for id ${id}`)
    }
    return result
  }

  async getById(id: number) {
    return db.season.get(id)
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

  async filter(filter: SeasonQueryFilter) {
    return db.season.where(filter).toArray()
  }

  async delete(filter: SeasonQueryFilter) {
    if (filter.id === undefined)
      throw new Error('id must be provided for delete operation')

    await db.transaction('rw', db.episode, db.season, async () => {
      await db.episode
        .where({
          seasonId: filter.id!,
        })
        .delete()
      await db.season.delete(filter.id!)
    })
  }
}
