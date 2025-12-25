import { Dexie } from 'dexie'
import { injectable } from 'inversify'

export type ImageCacheRecord = {
  src: string
  blob: Blob
  timeUpdated: number
  lastAccessed: number
}

@injectable()
export class DanmakuAnywhereImageDb extends Dexie {
  image!: Dexie.Table<ImageCacheRecord, string>

  isReady = new Promise<boolean>((resolve) => {
    this.on('ready', () => resolve(true))
  })

  constructor() {
    super('danmaku-anywhere-image')

    this.version(1).stores({
      image: 'src, timeUpdated',
    })

    this.version(2)
      .stores({
        image: 'src, timeUpdated, lastAccessed',
      })
      .upgrade(async (tx) => {
        await tx
          .table('image')
          .toCollection()
          .modify((item) => {
            item.lastAccessed = item.timeUpdated
          })
      })

    this.open()
  }
}
