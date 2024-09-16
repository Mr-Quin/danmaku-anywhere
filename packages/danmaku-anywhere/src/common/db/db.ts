import Dexie from 'dexie'

import type { Danmaku, DanmakuInsert } from '@/common/danmaku/models/danmaku'
import type { TitleMapping } from '@/common/danmaku/models/titleMapping'

class DanmakuAnywhereDb extends Dexie {
  danmaku!: Dexie.Table<Danmaku, number, DanmakuInsert>
  titleMapping!: Dexie.Table<TitleMapping, string>

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
          } else if (provider === 1) {
            return 'DanDanPlay'
          } else if (provider === 2) {
            return 'Bilibili'
          } else if (provider === 3) {
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

    this.open()
  }
}

export const db = new DanmakuAnywhereDb()
