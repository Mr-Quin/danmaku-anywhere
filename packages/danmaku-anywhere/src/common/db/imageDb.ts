import { Dexie } from 'dexie'

export type ImageCacheRecord = {
  src: string
  dataUrl: string
  timeUpdated: number
}

class DanmakuAnywhereImageDb extends Dexie {
  image!: Dexie.Table<ImageCacheRecord, string>

  isReady = new Promise<boolean>((resolve) => {
    this.on('ready', () => resolve(true))
  })

  constructor() {
    super('danmaku-anywhere-image')

    this.version(1).stores({
      image: 'src, timeUpdated',
    })

    this.open()
  }
}

export const imageDb = new DanmakuAnywhereImageDb()
