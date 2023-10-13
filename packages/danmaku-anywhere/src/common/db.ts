import Dexie from 'dexie'
import { DanmakuCache } from './hooks/danmaku/useDanmakuQuery'

class MyDb extends Dexie {
  // Declare implicit table properties.
  // (just to inform Typescript. Instantiated by Dexie in stores() method)
  dandanplay!: Dexie.Table<DanmakuCache, number> // number = type of the primkey

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
