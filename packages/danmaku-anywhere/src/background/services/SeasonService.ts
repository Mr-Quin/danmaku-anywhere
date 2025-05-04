import { SeasonInsertV1, SeasonV1 } from '@/common/anime/types/v1/schema'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { db } from '@/common/db/db'
import { DbEntity } from '@/common/types/dbEntity'

export class SeasonService {
  constructor(private table: typeof db.season) {}

  async bulkUpsert<T extends SeasonInsertV1>(
    data: T[]
  ): Promise<DbEntity<T>[]> {
    const results: DbEntity<T>[] = []

    for (const item of data) {
      results.push(await this.upsert(item))
    }

    return results
  }

  async upsert<T extends SeasonInsertV1>(data: T): Promise<DbEntity<T>> {
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

  async mustGetByProviderId<T extends DanmakuSourceType>(
    provider: T,
    seasonId: string
  ): Promise<
    Extract<
      SeasonV1,
      {
        provider: T
      }
    >
  > {
    const results = await this.table
      .where({ provider, indexedId: seasonId })
      .toArray()
    if (results.length < 1) {
      throw new Error(`No season found for ${provider} ${seasonId}`)
    }
    if (results.length > 1) {
      throw new Error(
        `Multiple seasons found for ${provider} ${seasonId}, this is likely a bug.`
      )
    }
    return results[0] as Extract<
      SeasonV1,
      {
        provider: T
      }
    >
  }

  async getAll() {
    return this.table.toArray()
  }
}
