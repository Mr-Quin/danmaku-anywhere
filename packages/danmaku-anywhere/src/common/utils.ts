import { logger } from '@/common/logger'

export const toArray = <T>(value: T | T[]): T[] => {
  return Array.isArray(value) ? value : [value]
}

export const getActiveTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

export const getOrigin = (url: string) => {
  try {
    const pattern = new URL(url)

    return `${pattern.origin}`
  } catch (e) {
    // in case the url is invalid, just return it
    return url
  }
}

export const createUrlPattern = (pattern: string) => {
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
    logger.error(e)
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
