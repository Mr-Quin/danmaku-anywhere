import { matchUrl } from '@/common/utils/matchUrl'

export const EXTERNALLY_CONNECTABLE_PATTERNS = [
  '*://danmaku.weeblify.app/*',
  ...(import.meta.env.DEV ? ['http://localhost:4321/*'] : []),
]

export const IS_EXTERNALLY_CONNECTABLE = EXTERNALLY_CONNECTABLE_PATTERNS.some(
  (pattern) => {
    return matchUrl(window.location.href, pattern)
  }
)
