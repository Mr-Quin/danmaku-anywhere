import type {
  DanDanComment,
  DanDanCommentAPIParams,
} from '@danmaku-anywhere/danmaku-engine'
import Dexie from 'dexie'

export interface DanmakuMeta {
  episodeId: number
  animeId: number
  episodeTitle?: string
  animeTitle: string
}

export interface DanmakuCache {
  comments: DanDanComment[]
  count: number
  meta: DanmakuMeta
  params: Partial<DanDanCommentAPIParams>
  timeUpdated: number
  version: number
}

export interface TitleMapping {
  originalTitle: string
  title: string
  source: string
  animeId: number
}

class DanmakuAnywhereDb extends Dexie {
  danmakuCache!: Dexie.Table<DanmakuCache, number>
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

    this.open()
  }
}

export const db = new DanmakuAnywhereDb()
