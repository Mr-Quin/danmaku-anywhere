import 'fake-indexeddb/auto'
import type {
  Bookmark,
  EpisodeMeta,
  EpisodeStub,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProviderService } from '@/background/services/providers/ProviderService'
import { DANMAKU_DB_NAME, DanmakuAnywhereDb } from '@/common/db/db'
import { makeSeasonRow } from '@/tests/factories'
import { BookmarkService } from './BookmarkService'

const stub = (indexedId: string, episodeNumber?: number): EpisodeStub => ({
  providerIds: {},
  title: `ep ${indexedId}`,
  episodeNumber,
  indexedId,
})

const current = {
  indexedId: 'a',
  episodeNumber: 1,
  seasonId: 7,
} as WithSeason<EpisodeMeta>

const bookmark = (episodes: EpisodeStub[]): Bookmark => ({
  id: 1,
  seasonId: 7,
  episodes,
  lastRefreshed: 0,
  timeUpdated: 0,
  version: 1,
})

describe('BookmarkService.preloadNextEpisode', () => {
  let service: BookmarkService
  let provider: {
    getDanmaku: ProviderService['getDanmaku']
    fetchEpisodesBySeason: ProviderService['fetchEpisodesBySeason']
  }

  beforeEach(() => {
    service = new BookmarkService({} as DanmakuAnywhereDb)
    provider = {
      getDanmaku: vi.fn<ProviderService['getDanmaku']>(),
      fetchEpisodesBySeason: vi.fn<ProviderService['fetchEpisodesBySeason']>(),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const run = (autoBookmark: boolean) =>
    service.preloadNextEpisode(
      current,
      provider as unknown as ProviderService, // lint-specs-allow-cast: ProviderService has private fields; double only implements the 2 methods this test calls
      autoBookmark
    )

  it('does nothing when not bookmarked and autoBookmark is off', async () => {
    vi.spyOn(service, 'getBySeason').mockResolvedValue(undefined)
    const add = vi.spyOn(service, 'add')
    expect(await run(false)).toBe(false)
    expect(add).not.toHaveBeenCalled()
    expect(provider.getDanmaku).not.toHaveBeenCalled()
  })

  it('auto-bookmarks then preloads when not bookmarked and autoBookmark is on', async () => {
    vi.spyOn(service, 'getBySeason').mockResolvedValue(undefined)
    vi.spyOn(service, 'add').mockResolvedValue(
      bookmark([stub('a', 1), stub('b', 2)])
    )
    vi.spyOn(service, 'isStale').mockReturnValue(false)
    expect(await run(true)).toBe(true)
    expect(service.add).toHaveBeenCalledWith(7, provider)
    expect(provider.getDanmaku).toHaveBeenCalledWith({
      type: 'by-stub',
      stub: stub('b', 2),
      seasonId: 7,
    })
  })

  it('preloads the next stub for a bookmarked show without reporting a new bookmark', async () => {
    vi.spyOn(service, 'getBySeason').mockResolvedValue(
      bookmark([stub('a', 1), stub('b', 2)])
    )
    vi.spyOn(service, 'isStale').mockReturnValue(false)
    expect(await run(false)).toBe(false)
    expect(provider.getDanmaku).toHaveBeenCalledWith({
      type: 'by-stub',
      stub: stub('b', 2),
      seasonId: 7,
    })
  })

  it('does not refresh or fetch when next is missing but bookmark is fresh', async () => {
    vi.spyOn(service, 'getBySeason').mockResolvedValue(bookmark([stub('a', 1)]))
    vi.spyOn(service, 'isStale').mockReturnValue(false)
    const refresh = vi.spyOn(service, 'refresh')
    await run(false)
    expect(refresh).not.toHaveBeenCalled()
    expect(provider.getDanmaku).not.toHaveBeenCalled()
  })

  it('refreshes once and retries when next is missing and bookmark is stale', async () => {
    vi.spyOn(service, 'getBySeason').mockResolvedValue(bookmark([stub('a', 1)]))
    vi.spyOn(service, 'isStale').mockReturnValue(true)
    vi.spyOn(service, 'refresh').mockResolvedValue(
      bookmark([stub('a', 1), stub('b', 2)])
    )
    await run(false)
    expect(service.refresh).toHaveBeenCalledWith(1, provider)
    expect(provider.getDanmaku).toHaveBeenCalledWith({
      type: 'by-stub',
      stub: stub('b', 2),
      seasonId: 7,
    })
  })

  it('does not fetch when next is still missing after refresh', async () => {
    vi.spyOn(service, 'getBySeason').mockResolvedValue(bookmark([stub('a', 1)]))
    vi.spyOn(service, 'isStale').mockReturnValue(true)
    vi.spyOn(service, 'refresh').mockResolvedValue(bookmark([stub('a', 1)]))
    await run(false)
    expect(provider.getDanmaku).not.toHaveBeenCalled()
  })
})

describe('BookmarkService.deleteBySeasonIdentity', () => {
  let db: DanmakuAnywhereDb
  let service: BookmarkService

  async function addBookmarkedSeason(
    overrides: Partial<SeasonInsert>
  ): Promise<number> {
    const seasonId = await db.season.add(makeSeasonRow(overrides))
    await db.bookmark.add({
      seasonId,
      episodes: [],
      lastRefreshed: 0,
      timeUpdated: 0,
      version: 1,
    })
    return seasonId
  }

  beforeEach(async () => {
    await Dexie.delete(DANMAKU_DB_NAME)
    db = new DanmakuAnywhereDb()
    await db.open()
    service = new BookmarkService(db)
  })

  afterEach(async () => {
    db.close()
    await Dexie.delete(DANMAKU_DB_NAME)
  })

  it('deletes only bookmarks of seasons matching both manifestId and namespaceKey', async () => {
    const sharedNamespace = 'ns:abcd1234'
    const deleted = await addBookmarkedSeason({
      manifestId: 'alpha',
      namespaceKey: sharedNamespace,
    })
    const otherManifest = await addBookmarkedSeason({
      manifestId: 'beta',
      namespaceKey: sharedNamespace,
      indexedId: 'idx-2',
    })
    const otherNamespace = await addBookmarkedSeason({
      manifestId: 'alpha',
      namespaceKey: 'alpha',
      indexedId: 'idx-3',
    })

    await service.deleteBySeasonIdentity('alpha', sharedNamespace)

    expect(await db.bookmark.where({ seasonId: deleted }).first()).toBe(
      undefined
    )
    expect(
      await db.bookmark.where({ seasonId: otherManifest }).first()
    ).toBeDefined()
    expect(
      await db.bookmark.where({ seasonId: otherNamespace }).first()
    ).toBeDefined()
  })
})
