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

export const EXTENSION_VERSION = chrome.runtime.getManifest().version

export const EXTENSION_REPO = 'https://github.com/Mr-Quin/danmaku-anywhere'
