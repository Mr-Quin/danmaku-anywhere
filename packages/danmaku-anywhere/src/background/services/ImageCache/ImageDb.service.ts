import { inject, injectable } from 'inversify'
import {
  DanmakuAnywhereImageDb,
  type ImageCacheRecord,
} from '@/common/db/imageDb'

@injectable()
export class ImageDbService {
  constructor(
    @inject(DanmakuAnywhereImageDb) private db: DanmakuAnywhereImageDb
  ) {}

  public async get(src: string): Promise<ImageCacheRecord | undefined> {
    return this.db.image.get(src)
  }

  public async put(record: ImageCacheRecord): Promise<void> {
    await this.db.image.put(record)
  }

  public async update(
    src: string,
    changes: Partial<ImageCacheRecord>
  ): Promise<void> {
    await this.db.image.update(src, changes)
  }

  public async count(): Promise<number> {
    return this.db.image.count()
  }

  /**
   * Prune the oldest N items from the cache
   */
  public async pruneOldest(deleteCount: number): Promise<void> {
    const oldestKeys = await this.db.image
      .orderBy('lastAccessed')
      .limit(deleteCount)
      .primaryKeys()

    await this.db.image.bulkDelete(oldestKeys)
  }
}
