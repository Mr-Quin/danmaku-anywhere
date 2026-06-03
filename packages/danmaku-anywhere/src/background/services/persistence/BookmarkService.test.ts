import type {
  Bookmark,
  EpisodeMeta,
  EpisodeStub,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProviderService } from '@/background/services/providers/ProviderService'
import type { DanmakuAnywhereDb } from '@/common/db/db'
import { BookmarkService } from './BookmarkService'

const stub = (indexedId: string, episodeNumber?: number): EpisodeStub => ({
  provider: DanmakuSourceType.DanDanPlay,
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
  providerConfigId: 'DanDanPlay',
  episodes,
  lastRefreshed: 0,
  timeUpdated: 0,
  version: 1,
})

describe('BookmarkService.preloadNextEpisode', () => {
  let service: BookmarkService
  let provider: {
    getDanmaku: ReturnType<typeof vi.fn>
    fetchEpisodesBySeason: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    service = new BookmarkService({} as DanmakuAnywhereDb)
    provider = { getDanmaku: vi.fn(), fetchEpisodesBySeason: vi.fn() }
  })

  const run = (autoBookmark: boolean) =>
    service.preloadNextEpisode(
      current,
      provider as unknown as ProviderService,
      autoBookmark
    )

  it('does nothing when not bookmarked and autoBookmark is off', async () => {
    vi.spyOn(service, 'getBySeason').mockResolvedValue(undefined)
    const add = vi.spyOn(service, 'add')
    await run(false)
    expect(add).not.toHaveBeenCalled()
    expect(provider.getDanmaku).not.toHaveBeenCalled()
  })

  it('auto-bookmarks then preloads when not bookmarked and autoBookmark is on', async () => {
    vi.spyOn(service, 'getBySeason').mockResolvedValue(undefined)
    vi.spyOn(service, 'add').mockResolvedValue(
      bookmark([stub('a', 1), stub('b', 2)])
    )
    vi.spyOn(service, 'isStale').mockReturnValue(false)
    await run(true)
    expect(service.add).toHaveBeenCalledWith(7, provider)
    expect(provider.getDanmaku).toHaveBeenCalledWith({
      type: 'by-stub',
      stub: stub('b', 2),
      seasonId: 7,
    })
  })

  it('preloads the next stub for a bookmarked show', async () => {
    vi.spyOn(service, 'getBySeason').mockResolvedValue(
      bookmark([stub('a', 1), stub('b', 2)])
    )
    vi.spyOn(service, 'isStale').mockReturnValue(false)
    await run(false)
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
