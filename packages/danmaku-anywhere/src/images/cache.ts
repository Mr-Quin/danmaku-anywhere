import type { ImageFetchOptions } from '@/common/components/image/types'
import { type ImageCacheRecord, imageDb } from '@/common/db/imageDb'

const getCachedImage = async (src: string) => {
  return imageDb.image.get(src)
}

const setCachedImage = async (src: string, blob: Blob) => {
  const record: ImageCacheRecord = { src, blob, timeUpdated: Date.now() }
  await imageDb.image.put(record)
}

const fetchImageBlob = async (src: string) => {
  const res = await fetch(src)
  return res.blob()
}

const blobToDataUrl = async (blob: Blob): Promise<string> => {
  const { promise, resolve, reject } = Promise.withResolvers<string>()
  const reader = new FileReader()
  reader.readAsDataURL(blob)
  reader.onloadend = () => {
    if (typeof reader.result === 'string') resolve(reader.result)
    else reject('failed to convert image to base64')
  }
  return promise
}

export const fetchAndCacheImage = async (src: string) => {
  const blob = await fetchImageBlob(src)
  await setCachedImage(src, blob)
  return blob
}

export const getOrFetchCachedImage = async (
  src: string,
  options?: ImageFetchOptions
) => {
  // bypass cache entirely
  if (options?.cache === false) {
    const blob = await fetchImageBlob(src)
    return blobToDataUrl(blob)
  }

  const cached = await getCachedImage(src)
  if (!cached) {
    const blob = await fetchAndCacheImage(src)
    return blobToDataUrl(blob)
  }

  // 1 week in milliseconds
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const isStale = Date.now() - cached.timeUpdated > ONE_WEEK_MS

  // Background refresh if stale
  if (isStale) {
    void refreshImageInBackground(src, cached)
  }

  return blobToDataUrl(cached.blob)
}

const refreshImageInBackground = async (
  src: string,
  previous?: ImageCacheRecord
) => {
  try {
    const blob = await fetchImageBlob(src)
    if (!previous) {
      await setCachedImage(src, blob)
      return
    }
    // Only write if changed in size or type to avoid unnecessary writes
    if (
      previous.blob?.size !== blob.size ||
      previous.blob?.type !== blob.type
    ) {
      await setCachedImage(src, blob)
    }
  } catch {
    // ignore background refresh errors
  }
}
