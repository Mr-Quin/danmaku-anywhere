import Dexie from 'dexie'
import {
  DanDanComment,
  DanDanCommentAPIParams,
} from '@danmaku-anywhere/danmaku-engine'

export interface DanmakuMeta {
  episodeId: number
  animeId: number
  episodeTitle: string
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

class MyDb extends Dexie {
  // Declare implicit table properties.
  // (just to inform Typescript. Instantiated by Dexie in stores() method)
  dandanplay!: Dexie.Table<DanmakuCache, number> // number = type of the primkey

  isReady: Promise<boolean> = new Promise((resolve) => {
    this.on('ready', () => resolve(true))
  })

  constructor() {
    super('danmaku')

    this.version(1).stores({
      dandanplay: 'meta.episodeId',
    })

    this.version(2).stores({
      dandanplay: 'meta.episodeId, meta.animeId, meta.animeTitle',
    })

    this.open()
  }
}

export const db = new MyDb()
