import type { MountConfig } from '@/common/options/mountConfig/schema'
import { matchUrl } from '@/common/utils/matchUrl'

const AI_BLACKLIST_SITES = [
  'https://www.google.com',
  'https://www.wikipedia.org',
  'https://www.github.com',
  'https://www.yahoo.com',
  'https://www.baidu.com',
  'https://www.bilibili.com',
  'https://www.tiktok.com',
  'https://www.douyin.com',
  'http://www.google.com',
  'http://www.wikipedia.org',
  'http://www.github.com',
  'http://www.yahoo.com',
  'http://www.baidu.com',
  'http://www.bilibili.com',
  'http://www.tiktok.com',
  'http://www.douyin.com',
]

export const isPatternPermissive = (pattern: string) => {
  return AI_BLACKLIST_SITES.some((s) => {
    return matchUrl(s, pattern)
  })
}

export const isConfigPermissive = (config: MountConfig): boolean => {
  // check if the config contains patterns that match any of the blacklisted sites
  return config.patterns.some((p) => {
    return isPatternPermissive(p)
  })
}

export const isConfigIncomplete = (config: MountConfig): boolean => {
  return config.mode === 'xpath' && !config.integration
}
