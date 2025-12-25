import { inject, injectable } from 'inversify'
import { ImageDbService } from '@/background/services/ImageCache/ImageDb.service'
import type { ImageFetchOptions } from '@/common/components/image/types'
import type { ImageCacheRecord } from '@/common/db/imageDb'

const REFETCH_INTERVAL = 7 * 24 * 60 * 60 * 1000 // 7 days
const CACHE_CAPACITY = 512
const PRUNE_PROBABILITY = 0.1
const TOUCH_INTERVAL = 10 * 60 * 1000 // 10 minutes

@injectable()
export class ImageCacheService {
  constructor(@inject(ImageDbService) private imageDb: ImageDbService) {}

  async get(src: string): Promise<string> {
    const blob = await this.fetchImageBlob(src)
    return this.blobToDataUrl(blob)
  }

  async getOrFetch(src: string, options?: ImageFetchOptions): Promise<string> {
    if (options?.cache === false) {
      const blob = await this.fetchImageBlob(src)
      return this.blobToDataUrl(blob)
    }

    const cached = await this.imageDb.get(src)

    if (cached) {
      void this.touch(cached)

      const isStale = Date.now() - cached.timeUpdated > REFETCH_INTERVAL

      if (isStale) {
        void this.refreshImageInBackground(src, cached)
      }

      return this.blobToDataUrl(cached.blob)
    }

    const blob = await this.fetchAndCacheImage(src)
    return this.blobToDataUrl(blob)
  }

  private async fetchAndCacheImage(src: string): Promise<Blob> {
    const blob = await this.fetchImageBlob(src)
    await this.setCachedImage(src, blob)

    // reduce prune frequency to avoid thrashing
    if (Math.random() < PRUNE_PROBABILITY) {
      void this.prune()
    }

    return blob
  }

  private async setCachedImage(src: string, blob: Blob) {
    const record: ImageCacheRecord = {
      src,
      blob,
      timeUpdated: Date.now(),
      lastAccessed: Date.now(),
    }
    await this.imageDb.put(record)
  }

  private async touch(record: ImageCacheRecord) {
    const now = Date.now()
    // only touch if it's been at least TOUCH_INTERVAL_MS since last touch
    if (now - record.lastAccessed < TOUCH_INTERVAL) {
      return
    }
    await this.imageDb.update(record.src, { lastAccessed: now })
  }

  private async refreshImageInBackground(
    src: string,
    previous?: ImageCacheRecord
  ) {
    try {
      const blob = await this.fetchImageBlob(src)

      if (!previous) {
        await this.setCachedImage(src, blob)
        return
      }

      // Only write if changed in size or type to avoid unnecessary writes
      // OR if we just want to update the timestamp (revalidation success)
      let shouldUpdate = false
      if (
        previous.blob?.size !== blob.size ||
        previous.blob?.type !== blob.type
      ) {
        shouldUpdate = true
      } else {
        // Content hasn't changed, but we should update timeUpdated so we don't check again too soon
        // We can just query and update timeUpdated
        await this.imageDb.update(src, {
          timeUpdated: Date.now(),
          lastAccessed: Date.now(),
        })
        return
      }

      if (shouldUpdate) {
        await this.setCachedImage(src, blob)
      }
    } catch {
      // ignore background refresh errors
    }
  }

  private fetchImageBlob = async (src: string): Promise<Blob> => {
    const res = await fetch(src)
    return res.blob()
  }

  private blobToDataUrl = async (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') resolve(reader.result)
        else reject('failed to convert image to base64')
      }
      reader.onerror = (e) => {
        reject(e)
      }
      reader.readAsDataURL(blob)
    })
  }

  private async prune(capacity = CACHE_CAPACITY) {
    const count = await this.imageDb.count()

    if (count <= capacity) {
      return
    }

    const deleteCount = count - capacity
    await this.imageDb.pruneOldest(deleteCount)
  }
}
