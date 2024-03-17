import { Logger } from '@/common/services/Logger'

export const toArray = <T>(value: T | T[]): T[] => {
  return Array.isArray(value) ? value : [value]
}

export const hasOriginPermission = async (origins: string[]) => {
  return chrome.permissions.contains({
    origins,
  })
}

export const validateOrigin = async (origin: string) => {
  try {
    await chrome.permissions.contains({
      origins: [origin],
    })
    return ''
  } catch (e: any) {
    return (e.message as string) ?? 'invalid pattern'
  }
}

export const requestOriginPermission = async (origins: string[]) => {
  return chrome.permissions.request({
    origins,
  })
}

export const removeOriginPermission = async (origins: string[]) => {
  return chrome.permissions.remove({
    origins,
  })
}

const createUrlPattern = (pattern: string) => {
  // this will throw error if pattern is invalid
  return new URLPattern({
    search: '*',
    pathname: '*',
    hash: '*',
    baseURL: pattern,
  })
}

export const matchUrl = (url: string, pattern: string) => {
  try {
    const urlPattern = createUrlPattern(pattern)
    return urlPattern.test(url)
  } catch (e) {
    Logger.error(e)
    return false
  }
}

// golang style error handling
export const tryCatch = async <T>(fn: () => Promise<T>) => {
  try {
    return [await fn(), null] as const
  } catch (e) {
    return [null as T, e] as const
  }
}

export const invariant = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message)
  }
}

export const isServiceWorker = () => {
  // getBackgroundPage is not available in service worker
  return chrome.runtime.getBackgroundPage === undefined
}

export const getEpisodeId = (animeId: number, episodeNumber: number) => {
  return animeId * 10000 + episodeNumber
}

export const episodeIdToEpisodeNumber = (episodeId: number) => {
  return episodeId % 10000
}

export const sleep = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
