import type {
  Bookmark,
  BookmarkInsert,
  EpisodeMeta,
  EpisodeStub,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import { BOOKMARK_REFRESH_TTL_MS } from '@/common/bookmark/constants'
import { DanmakuAnywhereDb } from '@/common/db/db'
import { invariant, isServiceWorker } from '@/common/utils/utils'

type WithoutId<T> = Omit<T, 'id'>

export const episodeMetaToStub = (
  meta: WithSeason<EpisodeMeta>
): EpisodeStub => {
  const { title, episodeNumber, indexedId, provider, providerIds } = meta
  return {
    title,
    episodeNumber,
    indexedId,
    provider,
    providerIds,
  } as EpisodeStub
}

@injectable('Singleton')
export class BookmarkService {
  constructor(@inject(DanmakuAnywhereDb) private db: DanmakuAnywhereDb) {
    invariant(
      isServiceWorker(),
      'BookmarkService is only available in service worker'
    )
  }

  async add(data: WithoutId<BookmarkInsert>): Promise<Bookmark> {
    const toInsert = {
      ...data,
      timeUpdated: Date.now(),
      version: 1,
    }
    const id = await this.db.bookmark.add(toInsert)
    return { ...toInsert, id }
  }

  async delete(id: number): Promise<void> {
    await this.db.bookmark.delete(id)
  }

  async deleteBySeason(seasonId: number): Promise<void> {
    await this.db.bookmark.where({ seasonId }).delete()
  }

  async getAll(): Promise<Bookmark[]> {
    return this.db.bookmark.toArray()
  }

  async getBySeason(seasonId: number): Promise<Bookmark | undefined> {
    return this.db.bookmark.where({ seasonId }).first()
  }

  async updateEpisodes(id: number, episodes: EpisodeStub[]): Promise<Bookmark> {
    const existing = await this.db.bookmark.get(id)
    if (!existing) {
      throw new Error(`Bookmark not found: ${id}`)
    }
    const updated = {
      ...existing,
      episodes,
      lastRefreshed: Date.now(),
      timeUpdated: Date.now(),
      version: existing.version + 1,
    }
    await this.db.bookmark.update(id, updated)
    return updated
  }

  isStale(bookmark: Bookmark): boolean {
    return Date.now() - bookmark.lastRefreshed > BOOKMARK_REFRESH_TTL_MS
  }
}
