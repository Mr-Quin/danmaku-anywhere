import Dexie from 'dexie'

import { DanmakuSourceType, IntegrationType } from '@/common/danmaku/enums'
import type {
  CustomDanmaku,
  CustomDanmakuInsert,
  DanDanPlayDanmaku,
} from '@/common/danmaku/models/danmakuCache/db'
import type { TitleMapping } from '@/common/danmaku/models/titleMapping'

class DanmakuAnywhereDb extends Dexie {
  danmakuCache!: Dexie.Table<DanDanPlayDanmaku, number>
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
          .table<DanDanPlayDanmaku>('danmakuCache')
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
          .table<TitleMapping>('titleMapping')
          .toCollection()
          .modify((item) => {
            // At this moment plex is the only source, so we can safely assume it's plex
            item.integration = IntegrationType.Plex
            delete item.source
          })
      })

    this.open()
  }
}

export const db = new DanmakuAnywhereDb()
