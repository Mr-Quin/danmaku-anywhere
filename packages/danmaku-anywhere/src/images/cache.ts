import type { ImageFetchOptions } from '@/common/components/image/types'
import { imageDb } from '@/common/db/imageDb'

const getCachedImage = async (src: string) => {
  return imageDb.image.get(src)
}

const setCachedImage = async (src: string, dataUrl: string) => {
  await imageDb.image.put({ src, dataUrl, timeUpdated: Date.now() })
}

export const fetchImageBase64 = async (src: string) => {
  const res = await fetch(src)
  const blob = await res.blob()

  const { promise, resolve, reject } = Promise.withResolvers<string>()
  const reader = new FileReader()
  reader.readAsDataURL(blob)
  reader.onloadend = () => {
    if (typeof reader.result === 'string') {
      resolve(reader.result)
    } else {
      reject('failed to convert image to base64')
    }
  }
  return promise
}

export const fetchAndCacheImage = async (src: string) => {
  const dataUrl = await fetchImageBase64(src)
  await setCachedImage(src, dataUrl)
  return dataUrl
}

export const getOrFetchCachedImage = async (
  src: string,
  options?: ImageFetchOptions
) => {
  // bypass cache entirely
  if (options?.cache === false) {
    return fetchAndCacheImage(src)
  }

  const cached = await getCachedImage(src)
  if (!cached) {
    return fetchAndCacheImage(src)
  }

  // refresh if the image is more than 1 week old
  void refreshImageInBackground(src, cached.dataUrl)

  return cached.dataUrl
}

const refreshImageInBackground = async (src: string, previous?: string) => {
  try {
    const dataUrl = await fetchImageBase64(src)
    if (!previous || dataUrl !== previous) {
      await setCachedImage(src, dataUrl)
    }
  } catch {
    // ignore background refresh errors
  }
}
