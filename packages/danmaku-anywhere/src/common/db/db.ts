import Dexie from 'dexie'

import { DanmakuType } from '../types/danmaku/Danmaku'
import type {
  DDPDanmakuCache,
  CustomDanmakuCache,
  TitleMapping,
} from '../types/danmaku/Danmaku'

class DanmakuAnywhereDb extends Dexie {
  danmakuCache!: Dexie.Table<DDPDanmakuCache, number>
  manualDanmakuCache!: Dexie.Table<CustomDanmakuCache, number>
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
          .table<DDPDanmakuCache>('danmakuCache')
          .toCollection()
          .modify((item) => {
            item.meta.type = DanmakuType.DDP
          })
      })

    this.open()
  }
}

export const db = new DanmakuAnywhereDb()
