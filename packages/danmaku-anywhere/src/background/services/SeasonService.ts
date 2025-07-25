import type { Season, SeasonInsert } from '@danmaku-anywhere/danmaku-converter'
import type { SeasonQueryFilter } from '@/common/anime/dto'
import type { db } from '@/common/db/db'
import type { DbEntity } from '@/common/types/dbEntity'

export class SeasonService {
  constructor(
    private table: typeof db.season,
    private episodeTable: typeof db.episode
  ) {}

  async bulkUpsert<T extends SeasonInsert>(data: T[]): Promise<DbEntity<T>[]> {
    const results: DbEntity<T>[] = []

    for (const item of data) {
      results.push(await this.upsert(item))
    }

    return results
  }

  async upsert<T extends SeasonInsert>(data: T): Promise<DbEntity<T>> {
    const existing = await this.table.get({
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
      await this.table.update(existing.id, toInsert)
      return toInsert
    }

    const toInsert = {
      ...data,
      timeUpdated: Date.now(),
      version: 1,
    }
    const id = await this.table.add(toInsert)
    return {
      ...toInsert,
      id,
    }
  }

  async mustGetById(id: number) {
    const result = await this.table.get(id)
    if (!result) {
      throw new Error(`No season found for id ${id}`)
    }
    return result
  }

  async getAll() {
    const seasons: Season[] = []

    const episodeTable = this.episodeTable

    const allSeasons = await this.table.toArray()

    for (const season of allSeasons) {
      const episodeCount = await episodeTable
        .where({ seasonId: season.id })
        .count()
      if (episodeCount > 0) {
        seasons.push({
          ...season,
          localEpisodeCount: episodeCount,
        })
      }
    }

    return seasons
  }

  async filter(filter: SeasonQueryFilter) {
    return this.table.where(filter).toArray()
  }

  async delete(filter: SeasonQueryFilter) {
    if (filter.id === undefined)
      throw new Error('id must be provided for delete operation')

    await this.episodeTable
      .where({
        seasonId: filter.id,
      })
      .delete()
    await this.table.delete(filter.id)
  }
}
