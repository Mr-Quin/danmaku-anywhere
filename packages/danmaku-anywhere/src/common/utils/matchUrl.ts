import { Logger } from '@/common/Logger'
// TODO: URLPattern is not available in Firefox yet
import 'urlpattern-polyfill'

/**
 * Tests url against Match Patterns https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns
 * Assume valid patterns
 * This should only be used by content scripts
 */
export const matchUrl = (url: string, pattern: string) => {
  try {
    const urlPattern = new URLPattern(pattern)
    return urlPattern.test(url)
  } catch (e) {
    Logger.error(e)
    return false
  }
}
