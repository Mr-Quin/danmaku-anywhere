import { getAppUrls } from '@/common/appUrls'
import { matchUrl } from '@/common/utils/matchUrl'
import { tryCatchSync } from '@/common/utils/tryCatch'

export function isAllowedAppOrigin(origin: string): boolean {
  const [url, err] = tryCatchSync(() => new URL(origin))
  if (err) {
    return false
  }
  return getAppUrls(import.meta.env.DEV).some((pattern) => {
    return matchUrl(url.origin, pattern)
  })
}
