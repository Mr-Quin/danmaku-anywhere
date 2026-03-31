import {
  type BilibiliOf,
  type Bookmark,
  type DanDanPlayOf,
  DanmakuSourceType,
  type EpisodeMeta,
  type EpisodeStub,
  type TencentOf,
  type WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { inject, injectable } from 'inversify'
import type { ProviderService } from '@/background/services/providers/ProviderService'
import { BOOKMARK_REFRESH_TTL_MS } from '@/common/bookmark/constants'
import { DanmakuAnywhereDb } from '@/common/db/db'
import { invariant, isServiceWorker } from '@/common/utils/utils'

type WithoutId<T> = Omit<T, 'id'>

const toStub = (meta: WithSeason<EpisodeMeta>): EpisodeStub => {
  const base = {
    title: meta.title,
    episodeNumber: meta.episodeNumber,
    indexedId: meta.indexedId,
  }
  switch (meta.provider) {
    case DanmakuSourceType.DanDanPlay: {
      const typed = meta as DanDanPlayOf<WithSeason<EpisodeMeta>>
      return {
        ...base,
        provider: typed.provider,
        providerIds: typed.providerIds,
      }
    }
    case DanmakuSourceType.Bilibili: {
      const typed = meta as BilibiliOf<WithSeason<EpisodeMeta>>
      return {
        ...base,
        provider: typed.provider,
        providerIds: typed.providerIds,
      }
    }
    case DanmakuSourceType.Tencent: {
      const typed = meta as TencentOf<WithSeason<EpisodeMeta>>
      return {
        ...base,
        provider: typed.provider,
        providerIds: typed.providerIds,
      }
    }
  }
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
    const episodes = await providerService.fetchEpisodesBySeason(seasonId)
    const stubs = episodes.map(toStub)

    const season = await this.db.season.get(seasonId)
    if (!season) {
      throw new Error(`Season not found: ${seasonId}`)
    }

    const toInsert: WithoutId<Bookmark> = {
      seasonId,
      providerConfigId: season.providerConfigId,
      episodes: stubs,
      lastRefreshed: Date.now(),
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

  async deleteBySeasonIds(seasonIds: number[]): Promise<void> {
    if (seasonIds.length === 0) {
      return
    }
    await this.db.bookmark.where('seasonId').anyOf(seasonIds).delete()
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
    await this.db.bookmark.update(id, updated)
    return updated
  }

  isStale(bookmark: Bookmark): boolean {
    return Date.now() - bookmark.lastRefreshed > BOOKMARK_REFRESH_TTL_MS
  }
}
