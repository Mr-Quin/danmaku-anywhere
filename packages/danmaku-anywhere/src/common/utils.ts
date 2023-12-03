import { MountConfig } from '@/common/constants'
import { logger } from '@/common/logger'

export const IS_EXTENSION = !!chrome.runtime

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

export const matchConfig = (url: string, configs: MountConfig[]) => {
  return configs.find((config) => {
    const { patterns } = config
    return patterns.some((pattern) => matchUrl(url, pattern))
  })
}
