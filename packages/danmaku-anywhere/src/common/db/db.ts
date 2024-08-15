import Dexie from 'dexie'

import { DanmakuSourceType, IntegrationType } from '@/common/danmaku/enums'
import type {
  CustomDanmaku,
  CustomDanmakuInsert,
  Danmaku,
  DanmakuInsert,
} from '@/common/danmaku/models/danmaku'
import type { TitleMapping } from '@/common/danmaku/models/titleMapping'

class DanmakuAnywhereDb extends Dexie {
  danmakuCache!: Dexie.Table<Danmaku, number, DanmakuInsert>
  manualDanmakuCache!: Dexie.Table<CustomDanmaku, number, CustomDanmakuInsert>
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
            item.meta.type = DanmakuSourceType.DDP
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
            item.integration = IntegrationType.Plex
            delete item.source
          })
      })

    this.version(7)
      .stores({
        // change danmakuCache primary key to id and add provider field
        danmakuCache:
          '++id, [provider+episodeId], provider, episodeId, seasonId',
        // merge manualDanmakuCache to danmakuCache
        manualDanmakuCache: null,
        titleMapping: '++id, originalTitle, title, integration',
      })
      .upgrade(async (tx) => {
        // Upgrade danmakuCache
        await tx
          .table('danmakuCache')
          .toCollection()
          .modify((item) => {
            // Add provider field, assume DanDanPlay for existing data
            item.provider = DanmakuSourceType.DDP
            // Rename meta fields
            item.meta = {
              provider: DanmakuSourceType.DDP,
              episodeId: item.meta.episodeId,
              animeId: item.meta.animeId,
              episodeTitle: item.meta.episodeTitle,
              animeTitle: item.meta.animeTitle,
            }
            // Add commentCount field
            item.commentCount = item.comments.length
            // Add schemaVersion field
            item.schemaVersion = 2
            item.episodeId = item.meta.episodeId
            item.seasonId = item.meta.animeId
            item.episodeTitle = item.meta.episodeTitle
            item.seasonTitle = item.meta.animeTitle
          })

        // Merge manualDanmakuCache to danmakuCache
        await tx.table('manualDanmakuCache').each(async (item) => {
          await tx.table('danmakuCache').add({
            provider: DanmakuSourceType.Custom,
            meta: {
              // removed episodeId
              provider: DanmakuSourceType.Custom,
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
            episodeTitle: item.meta.episodeTitle,
            seasonTitle: item.meta.animeTitle,
          })
        })
      })

    this.open()
  }
}

export const db = new DanmakuAnywhereDb()
