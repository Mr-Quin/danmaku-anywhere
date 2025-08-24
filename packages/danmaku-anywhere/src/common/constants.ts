import { matchUrl } from '@/common/utils/matchUrl'

export const EXTERNALLY_CONNECTABLE_PATTERNS = [
  '*://danmaku.weeblify.app/*',
  ...(import.meta.env.DEV ? ['http://localhost:4321/*'] : []),
]

export const IS_EXTERNALLY_CONNECTABLE = EXTERNALLY_CONNECTABLE_PATTERNS.some(
  (pattern) => {
    if (typeof window === 'undefined') return false
    return matchUrl(window.location.href, pattern)
  }
)

export const IS_FIREFOX = import.meta.env.VITE_TARGET_BROWSER === 'firefox'
export const IS_CHROME = import.meta.env.VITE_TARGET_BROWSER === 'chrome'

export const EXTENSION_VERSION = import.meta.env.VERSION

export const EXTENSION_REPO = 'https://github.com/Mr-Quin/danmaku-anywhere'

// Blacklist of popular sites where AI/integration should be disabled by default
export const AI_BLACKLIST_PATTERNS = [
  '*://*.google.com/*',
  '*://*.docs.google.com/*',
  '*://*.mail.google.com/*',
  '*://*.wikipedia.org/*',
  '*://*.github.com/*',
  '*://*.gitlab.com/*',
  '*://*.bitbucket.org/*',
  '*://*.amazon.com/*',
  '*://*.amazon.*/*',
  '*://*.facebook.com/*',
  '*://*.x.com/*',
  '*://*.twitter.com/*',
  '*://*.reddit.com/*',
  '*://*.bing.com/*',
  '*://*.yahoo.com/*',
  '*://*.microsoft.com/*',
  '*://*.apple.com/*',
  '*://*.office.com/*',
  '*://*.notion.so/*',
  '*://*.slack.com/*',
  '*://*.linkedin.com/*',
]
