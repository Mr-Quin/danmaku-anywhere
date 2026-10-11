import {
  type BiliBiliDanmakuInsertV3,
  type Bookmark,
  type CustomEpisode,
  type DanDanPlayDanmakuInsertV3,
  DanmakuSourceType,
  type DanmakuV3,
  type Episode,
  type EpisodeV4,
  episodeMigration,
  PROVIDER_TO_BUILTIN_ID,
  type Season,
  stripBuiltinPrefix,
  stripHtml,
  type TencentDanmakuInsertV3,
} from '@danmaku-anywhere/danmaku-converter'
import { Dexie } from 'dexie'
import { injectable } from 'inversify'
import type { SeasonMapSnapshot } from '@/common/seasonMap/SeasonMap'

export const DANMAKU_DB_NAME = 'danmaku-anywhere'

type WithoutId<T> = Omit<T, 'id'>

// Keep this independent of the shared converter: v10 looks seasons up by
// provider and v12 derives providerConfigId from it.
function extractSeasonV10(
  item:
    | DanDanPlayDanmakuInsertV3
    | BiliBiliDanmakuInsertV3
    | TencentDanmakuInsertV3
) {
  const base = {
    provider: item.provider,
    providerConfigId: PROVIDER_TO_BUILTIN_ID[item.provider],
    title: stripHtml(item.seasonTitle),
    type: '',
    schemaVersion: 1,
  }
  switch (item.provider) {
    case DanmakuSourceType.DanDanPlay: {
      return {
        ...base,
        providerIds: {
          animeId: item.meta.animeId,
          bangumiId: item.meta.animeId.toString(),
        },
        indexedId: item.meta.animeId.toString(),
      }
    }
    case DanmakuSourceType.Bilibili: {
      return {
        ...base,
        providerIds: { seasonId: item.meta.seasonId },
        indexedId: item.meta.seasonId.toString(),
      }
    }
    case DanmakuSourceType.Tencent: {
      return {
        ...base,
        providerIds: { cid: item.meta.cid },
        indexedId: item.meta.cid.toString(),
      }
    }
  }
}

const V15_BUILTIN_IDS = new Set(['dandanplay', 'bilibili', 'tencent'])

const V15_BUILTIN_ID_BY_PROVIDER = new Map<unknown, string>([
  ['DanDanPlay', 'dandanplay'],
  ['Bilibili', 'bilibili'],
  ['Tencent', 'tencent'],
])

// A built-in config id is its manifest id. Every custom instance v1.5.0 could
// create was DanDanPlay-compatible, and MacCMS never stored seasons.
function manifestIdForV15(season: {
  provider?: unknown
  providerConfigId?: unknown
}): string {
  if (
    typeof season.providerConfigId === 'string' &&
    V15_BUILTIN_IDS.has(season.providerConfigId)
  ) {
    return season.providerConfigId
  }
  return V15_BUILTIN_ID_BY_PROVIDER.get(season.provider) ?? 'dandanplay'
}

function seasonKeyV16(providerConfigId: unknown, indexedId: unknown): string {
  return JSON.stringify([providerConfigId, indexedId])
}

@injectable('Singleton')
export class DanmakuAnywhereDb extends Dexie {
  episode!: Dexie.Table<Episode, number, WithoutId<Episode>>
  customEpisode!: Dexie.Table<CustomEpisode, number, WithoutId<CustomEpisode>>
  season!: Dexie.Table<Season, number, WithoutId<Season>>
  seasonMap!: Dexie.Table<SeasonMapSnapshot, string>
  bookmark!: Dexie.Table<Bookmark, number, WithoutId<Bookmark>>

  isReady = new Promise<boolean>((resolve) => {
    this.on('ready', () => resolve(true))
  })

  constructor() {
    super(DANMAKU_DB_NAME)

    this.version(1).stores({
      dandanplay: 'meta.episodeId',
    })

    this.version(2).stores({
      dandanplay: 'meta.episodeId, meta.animeId, meta.animeTitle',
    })

    this.version(3)
      .stores({
        dandanplay: 'meta.episodeId, meta.animeId, meta.animeTitle',
        danmakuCache: 'meta.episodeId, meta.animeId, meta.animeTitle',
      })
      .upgrade(async (tx) => {
        // copy data from dandanplay to danmakuCache
        const existingData = await tx.table('dandanplay').toArray()
        await tx.table('danmakuCache').bulkAdd(existingData)
        await tx.table('dandanplay').clear()
      })

    this.version(4).stores({
      dandanplay: null,
      danmakuCache: 'meta.episodeId, meta.animeId, meta.animeTitle',
      titleMapping: '++id, originalTitle, title, source',
    })

    this.version(5)
      .stores({
        dandanplay: null,
        danmakuCache: 'meta.episodeId, meta.animeId, meta.animeTitle',
        // auto increment id for manual danmaku
        manualDanmakuCache: '++meta.episodeId, meta.animeTitle',
        titleMapping: '++id, originalTitle, title, source',
      })
      .upgrade(async (tx) => {
        // add type field to danmakuCache.meta
        await tx
          .table('danmakuCache')
          .toCollection()
          .modify((item) => {
            item.meta.type = 1 // Old enum value for dandanplay
          })
      })

    this.version(6)
      .stores({
        dandanplay: null,
        danmakuCache: 'meta.episodeId, meta.animeId, meta.animeTitle',
        // auto increment id for manual danmaku
        manualDanmakuCache: '++meta.episodeId, meta.animeTitle',
        titleMapping: '++id, originalTitle, title, integration',
      })
      .upgrade(async (tx) => {
        // Rename source to integration and make it an enum type
        await tx
          .table('titleMapping')
          .toCollection()
          .modify((item) => {
            // At this moment plex is the only source, so we can safely assume it's plex
            item.integration = 1 // Old enum value for plex
            delete item.source
          })
      })

    this.version(7)
      .stores({
        // Add danmaku table
        danmaku:
          '++id, provider, episodeId, seasonId, &[provider+episodeId], [provider+seasonId]',
        manualDanmakuCache: null,
        danmakuCache: null,
        titleMapping: '++id, originalTitle, title, integration',
      })
      .upgrade(async (tx) => {
        // Merge danmakuCache to danmaku
        await tx.table('danmakuCache').each(async (item) => {
          // Skip items without episodeTitle, they are invalid under the new schema
          // This can happen in an early implementation of "automatically getting the next episode" where we did not fetch the episode title
          if (!item.meta.episodeTitle) return

          await tx.table('danmaku').add({
            provider: 1,
            meta: {
              provider: 1,
              episodeId: item.meta.episodeId,
              animeId: item.meta.animeId,
              episodeTitle: item.meta.episodeTitle,
              animeTitle: item.meta.animeTitle,
            },
            comments: item.comments,
            commentCount: item.comments.length,
            version: item.version,
            timeUpdated: item.timeUpdated,
            schemaVersion: 2,
            episodeId: item.meta.episodeId,
            seasonId: item.meta.animeId,
            episodeTitle: item.meta.episodeTitle,
            seasonTitle: item.meta.animeTitle,
          })
        })

        // Merge manualDanmakuCache to danmaku
        await tx.table('manualDanmakuCache').each(async (item) => {
          await tx.table('danmaku').add({
            provider: 0,
            meta: {
              // removed episodeId
              provider: 0,
              episodeTitle: item.meta.episodeTitle,
              seasonTitle: item.meta.animeTitle,
              episodeNumber: item.meta.episodeNumber,
            },
            comments: item.comments,
            commentCount: item.comments.length,
            version: item.version,
            timeUpdated: item.timeUpdated,
            schemaVersion: 2,
            episodeId: undefined,
            seasonId: undefined,
            episodeTitle:
              item.meta.episodeTitle ?? item.meta.episodeNumber?.toString(),
            seasonTitle: item.meta.animeTitle,
          })
        })
      })

    // This version migrates number enum to string enum
    // Affects danmaku.provider, danmaku.meta.provider, and titleMapping.integration
    // Increment schemaVersion to 3
    this.version(8)
      .stores({
        danmaku:
          '++id, provider, episodeId, seasonId, &[provider+episodeId], [provider+seasonId]',
        manualDanmakuCache: null,
        danmakuCache: null,
        titleMapping: '++id, originalTitle, title',
      })
      .upgrade(async (tx) => {
        const mapProvider = (provider: number) => {
          if (provider === 0) {
            return 'Custom'
          }
          if (provider === 1) {
            return 'DanDanPlay'
          }
          if (provider === 2) {
            return 'Bilibili'
          }
          if (provider === 3) {
            return 'Tencent'
          }
          return provider
        }
        await tx
          .table('danmaku')
          .toCollection()
          .modify((item) => {
            item.provider = mapProvider(item.provider)
            item.meta.provider = mapProvider(item.meta.provider)
            // Update schema version
            item.schemaVersion = 3
          })
      })

    // This version indexes timeUpdated field
    this.version(9).stores({
      danmaku:
        '++id, provider, episodeId, seasonId, &[provider+episodeId], [provider+seasonId], timeUpdated',
      manualDanmakuCache: null,
      danmakuCache: null,
      titleMapping: '++id, originalTitle, title',
    })

    /**
     * 1. Migrate danmaku schema from v3 to v4, rename danmaku to episode
     * 2. Separate season data from each episode, create a separate season table (FK: episode -> season)
     * 3. Separate (again) custom danmaku into its own table
     */
    this.version(10)
      .stores({
        episode:
          '++id, provider, indexedId, &[provider+indexedId], seasonId, timeUpdated, lastChecked',
        season: '++id, provider, indexedId, &[provider+indexedId]',
        customEpisode: '++id, title',
        danmaku: null,
        manualDanmakuCache: null,
        danmakuCache: null,
        titleMapping: null,
        seasonMap: 'key',
      })
      .upgrade(async (tx) => {
        await tx.table('danmaku').each(async (item: DanmakuV3) => {
          /**
           * 1. move custom danmaku to a separate table
           */
          if (item.provider === 'Custom') {
            await tx
              .table('customEpisode')
              .add(episodeMigration.customV3ToV4(item))
            return
          }

          /**
           * 2. for other danmaku types, first create a season for the danmaku
           */
          const getSeasonId = async () => {
            const seasonInsert = {
              ...extractSeasonV10(item),
              version: item.version,
              timeUpdated: Date.now(),
            }

            /**
             * the combination of provider and the item's original season id should be unique,
             * if the season is already in the table, don't add again
             */
            {
              const existingSeason = await tx.table('season').get({
                provider: item.provider,
                indexedId: seasonInsert.indexedId,
              })

              if (existingSeason) {
                return existingSeason.id
              }
            }

            try {
              /**
               * Try-catch in case adding a season fails
               */
              const seasonId: number = await tx
                .table('season')
                .add(seasonInsert)
              return seasonId
            } catch (error) {
              console.debug(error)
              return
            }
          }
          const seasonId = await getSeasonId()

          /**
           * if season id creation failed, we cannot use this entry, so skip it
           */
          if (seasonId === undefined) {
            console.error('skipped danmaku during migration', item)
            return
          }

          const episode: WithoutId<EpisodeV4> = {
            ...episodeMigration.v3ToV4(item, seasonId),
            version: item.version,
            timeUpdated: Date.now(),
          }

          /**
           * 3. with the season id, move the danmaku to a separate episode table
           */
          tx.table('episode').add(episode)
        })
      })

    /**
     * Index IDs in seasonMap
     */
    this.version(11).stores({
      episode:
        '++id, provider, indexedId, &[provider+indexedId], seasonId, timeUpdated, lastChecked',
      season: '++id, provider, indexedId, &[provider+indexedId]',
      customEpisode: '++id, title',
      seasonMap: 'key, DanDanPlay, Tencent, Bilibili, iQiyi',
    })

    /**
     * Make providerConfigId required for all seasons
     * Remove providerConfigId from episodes (get from season instead)
     * Change unique constraint on seasons from [provider+indexedId] to [providerConfigId+indexedId]
     * Migrate seasonMap to support dynamic providers
     */
    this.version(12)
      .stores({
        episode:
          '++id, provider, indexedId, &[seasonId+indexedId], seasonId, timeUpdated, lastChecked',
        season:
          '++id, provider, providerConfigId, indexedId, &[providerConfigId+indexedId]',
        customEpisode: '++id, title',
        seasonMap: 'key, *seasonIds',
      })
      .upgrade(async (tx) => {
        // Migrate seasons to use providerConfigId
        await tx
          .table('season')
          .toCollection()
          .modify((season) => {
            if (!season.providerConfigId) {
              season.providerConfigId =
                PROVIDER_TO_BUILTIN_ID[season.provider as DanmakuSourceType] ??
                'unknown'
            }
          })

        // Delete seasons that have an unknown provider
        await tx
          .table('season')
          .where('providerConfigId')
          .equals('unknown')
          .delete()

        // Remove provider config from episodes
        await tx
          .table('episode')
          .toCollection()
          .modify((episode) => {
            delete episode.providerConfigId
          })

        // Remove old index
        const store = tx.idbtrans.objectStore('season')
        if (store.indexNames.contains('[provider+indexedId]')) {
          store.deleteIndex('[provider+indexedId]')
        }

        // Wipe seasonMap table
        await tx.table('seasonMap').clear()
      })

    /**
     * Add bookmark table for saving season episode snapshots
     */
    this.version(13).stores({
      episode:
        '++id, provider, indexedId, &[seasonId+indexedId], seasonId, timeUpdated, lastChecked',
      season:
        '++id, provider, providerConfigId, indexedId, &[providerConfigId+indexedId]',
      customEpisode: '++id, title',
      seasonMap: 'key, *seasonIds',
      bookmark: '++id, &seasonId, providerConfigId',
    })

    /**
     * Strip the `builtin:` prefix from stored provider config ids. Remaps
     * season/bookmark.providerConfigId and the seasonMap.seasons keys so they
     * keep matching the bare config ids.
     */
    this.version(14)
      .stores({
        episode:
          '++id, provider, indexedId, &[seasonId+indexedId], seasonId, timeUpdated, lastChecked',
        season:
          '++id, provider, providerConfigId, indexedId, &[providerConfigId+indexedId]',
        customEpisode: '++id, title',
        seasonMap: 'key, *seasonIds',
        bookmark: '++id, &seasonId, providerConfigId',
      })
      .upgrade(async (tx) => {
        await tx
          .table('season')
          .toCollection()
          .modify((season) => {
            if (typeof season.providerConfigId === 'string') {
              season.providerConfigId = stripBuiltinPrefix(
                season.providerConfigId
              )
            }
          })

        await tx
          .table('bookmark')
          .toCollection()
          .modify((bookmark) => {
            if (typeof bookmark.providerConfigId === 'string') {
              bookmark.providerConfigId = stripBuiltinPrefix(
                bookmark.providerConfigId
              )
            }
          })

        await tx
          .table('seasonMap')
          .toCollection()
          .modify((entry) => {
            if (
              !entry.seasons ||
              typeof entry.seasons !== 'object' ||
              Array.isArray(entry.seasons)
            ) {
              return
            }
            const remapped: Record<string, number> = {}
            for (const [configId, seasonId] of Object.entries(entry.seasons)) {
              remapped[stripBuiltinPrefix(configId)] = seasonId as number
            }
            entry.seasons = remapped
          })
      })

    /**
     * Seasons are identified by providerConfigId + indexedId and carry the
     * manifestId of the source type. Runs after v14's prefix strip, so
     * providerConfigId is already bare here.
     */
    this.version(15)
      .stores({
        episode:
          '++id, indexedId, &[seasonId+indexedId], seasonId, timeUpdated, lastChecked',
        season:
          '++id, manifestId, providerConfigId, indexedId, &[providerConfigId+indexedId]',
        customEpisode: '++id, title',
        seasonMap: 'key, *seasonIds',
        bookmark: '++id, &seasonId',
      })
      .upgrade(async (tx) => {
        await tx
          .table('season')
          .toCollection()
          .modify((season) => {
            season.manifestId = manifestIdForV15(season)
            delete season.provider
          })

        await tx
          .table('bookmark')
          .toCollection()
          .modify((bookmark) => {
            delete bookmark.providerConfigId
          })
      })

    // Only for nightly profiles that ran the previous v15 body, which keyed
    // seasons by manifestId + namespaceKey. Store users never had namespaceKey.
    this.version(16)
      .stores({
        episode:
          '++id, indexedId, &[seasonId+indexedId], seasonId, timeUpdated, lastChecked',
        season:
          '++id, manifestId, providerConfigId, indexedId, &[providerConfigId+indexedId]',
        customEpisode: '++id, title',
        seasonMap: 'key, *seasonIds',
        bookmark: '++id, &seasonId',
      })
      .upgrade(async (tx) => {
        const seasons = tx.table('season')
        const taken = new Set<string>()
        await seasons.each((season) => {
          if (typeof season.providerConfigId === 'string') {
            taken.add(seasonKeyV16(season.providerConfigId, season.indexedId))
          }
        })

        await seasons
          .filter(
            (season) =>
              typeof season.providerConfigId !== 'string' ||
              typeof season.manifestId !== 'string'
          )
          .modify((season) => {
            if (typeof season.providerConfigId !== 'string') {
              const derived =
                season.namespaceKey === season.manifestId
                  ? season.manifestId
                  : season.namespaceKey
              const key = seasonKeyV16(derived, season.indexedId)
              // The previous v15 index was not unique, so two rows can derive
              // the same key. The later one becomes an orphan of its own.
              if (typeof derived === 'string' && !taken.has(key)) {
                season.providerConfigId = derived
                taken.add(key)
              } else {
                season.providerConfigId = `orphan:${season.id}`
              }
            }
            if (typeof season.manifestId !== 'string') {
              season.manifestId = manifestIdForV15(season)
            }
            delete season.namespaceKey
          })
      })

    this.open()
  }
}
