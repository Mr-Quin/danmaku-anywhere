import {
  type CustomEpisode,
  type DanmakuSourceType,
  type DanmakuV3,
  type Episode,
  type EpisodeV4,
  episodeMigration,
  type Season,
  type SeasonV1,
} from '@danmaku-anywhere/danmaku-converter'
import { Dexie } from 'dexie'
import { PROVIDER_TO_BUILTIN_ID } from '@/common/options/providerConfig/constant'
import type { SeasonMap } from '@/common/seasonMap/types'

type WithoutId<T> = Omit<T, 'id'>

class DanmakuAnywhereDb extends Dexie {
  episode!: Dexie.Table<Episode, number, WithoutId<Episode>>
  customEpisode!: Dexie.Table<CustomEpisode, number, WithoutId<CustomEpisode>>
  season!: Dexie.Table<Season, number, WithoutId<Season>>
  seasonMap!: Dexie.Table<SeasonMap, string>

  isReady = new Promise<boolean>((resolve) => {
    this.on('ready', () => resolve(true))
  })

  constructor() {
    super('danmaku-anywhere')

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
            const seasonInsert: WithoutId<SeasonV1> = {
              ...episodeMigration.v3ExtractSeason(item),
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
     */
    this.version(12)
      .stores({
        episode:
          '++id, provider, indexedId, &[provider+indexedId], seasonId, timeUpdated, lastChecked',
        season:
          '++id, provider, providerConfigId, indexedId, &[providerConfigId+indexedId]',
        customEpisode: '++id, title',
        seasonMap: 'key',
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
      })

    this.open()
  }
}

export const db = new DanmakuAnywhereDb()
