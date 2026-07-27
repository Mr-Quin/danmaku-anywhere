import { APP_URLS } from '@/common/appUrls'
import { matchUrl } from '@/common/utils/matchUrl'

export function isAllowedAppOrigin(origin: string): boolean {
  return APP_URLS.some((pattern) => {
    return matchUrl(origin, pattern)
  })
}
