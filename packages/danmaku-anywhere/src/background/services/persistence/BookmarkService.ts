import type {
  Bookmark,
  EpisodeMeta,
  EpisodeStub,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import { findNextStub } from '@/background/services/providers/common/findNextStub'
import type { ProviderService } from '@/background/services/providers/ProviderService'
import { BOOKMARK_REFRESH_TTL_MS } from '@/common/bookmark/constants'
import { DanmakuAnywhereDb } from '@/common/db/db'
import { invariant, isServiceWorker } from '@/common/utils/utils'

type WithoutId<T> = Omit<T, 'id'>

const toStub = (meta: WithSeason<EpisodeMeta>): EpisodeStub => {
  const { title, episodeNumber, indexedId, providerIds } = meta
  return {
    title,
    episodeNumber,
    indexedId,
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

  async add(
    seasonId: number,
    providerService: ProviderService
  ): Promise<Bookmark> {
    const existing = await this.getBySeason(seasonId)
    if (existing) {
      return existing
    }

    const season = await this.db.season.get(seasonId)
    if (!season) {
      throw new Error(`Season not found: ${seasonId}`)
    }

    const episodes = await providerService.fetchEpisodesBySeason(seasonId)
    const stubs = episodes.map(toStub)

    return this.db.transaction('rw', this.db.bookmark, async () => {
      // Re-check inside transaction: the first check above avoids the API call,
      // but a concurrent add could have inserted between then and now.
      // Without this, the second add would throw a ConstraintError on &seasonId.
      const existing = await this.getBySeason(seasonId)
      if (existing) {
        return existing
      }

      const toInsert: WithoutId<Bookmark> = {
        seasonId,
        episodes: stubs,
        lastRefreshed: Date.now(),
        timeUpdated: Date.now(),
        version: 1,
      }
      const id = await this.db.bookmark.add(toInsert)
      return { ...toInsert, id }
    })
  }

  async delete(id: number): Promise<void> {
    await this.db.bookmark.delete(id)
  }

  async deleteBySeason(seasonId: number): Promise<void> {
    await this.db.bookmark.where({ seasonId }).delete()
  }

  // Delete the bookmarks of every season in a content namespace. Used when a
  // provider config is removed: its seasons stay as orphans, but their bookmarks
  // (which only exist to fetch new episodes) go. Callers pass the config's
  // namespaceKey, computed before the config is deleted from storage.
  async deleteByNamespaceKey(namespaceKey: string): Promise<void> {
    const seasonIds = await this.db.season.where({ namespaceKey }).primaryKeys()
    if (seasonIds.length > 0) {
      await this.db.bookmark.where('seasonId').anyOf(seasonIds).delete()
    }
  }

  async getAll(): Promise<Bookmark[]> {
    return this.db.bookmark.toArray()
  }

  async getBySeason(seasonId: number): Promise<Bookmark | undefined> {
    return this.db.bookmark.where({ seasonId }).first()
  }

  async refresh(
    bookmarkId: number,
    providerService: ProviderService
  ): Promise<Bookmark> {
    const bookmark = await this.db.bookmark.get(bookmarkId)
    if (!bookmark) {
      throw new Error(`Bookmark not found: ${bookmarkId}`)
    }
    const episodes = await providerService.fetchEpisodesBySeason(
      bookmark.seasonId
    )
    const stubs = episodes.map(toStub)
    return this.updateEpisodes(bookmark.id, stubs)
  }

  async updateEpisodes(id: number, episodes: EpisodeStub[]): Promise<Bookmark> {
    const existing = await this.db.bookmark.get(id)
    if (!existing) {
      throw new Error(`Bookmark not found: ${id}`)
    }
    const updated: Bookmark = {
      ...existing,
      episodes,
      lastRefreshed: Date.now(),
      timeUpdated: Date.now(),
      version: existing.version + 1,
    }
    await this.db.bookmark.put(updated)
    return updated
  }

  isStale(bookmark: Bookmark): boolean {
    return Date.now() - bookmark.lastRefreshed > BOOKMARK_REFRESH_TTL_MS
  }

  /**
   * Returns true when this call created a new bookmark (autoBookmark), so the
   * caller can invalidate bookmark-dependent UI in other contexts.
   */
  async preloadNextEpisode(
    current: WithSeason<EpisodeMeta>,
    providerService: ProviderService,
    autoBookmark: boolean
  ): Promise<boolean> {
    const { seasonId } = current
    let bookmark = await this.getBySeason(seasonId)
    let bookmarked = false
    if (!bookmark) {
      if (!autoBookmark) {
        return false
      }
      bookmark = await this.add(seasonId, providerService)
      bookmarked = true
    }

    let next = findNextStub(bookmark.episodes, current)
    if (!next && this.isStale(bookmark)) {
      bookmark = await this.refresh(bookmark.id, providerService)
      next = findNextStub(bookmark.episodes, current)
    }
    if (next) {
      await providerService.getDanmaku({
        type: 'by-stub',
        stub: next,
        seasonId,
      })
    }

    return bookmarked
  }
}
