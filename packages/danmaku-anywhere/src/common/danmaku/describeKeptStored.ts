import type { KeptStored } from '@/common/danmaku/dto'
import { i18n } from '@/common/localization/i18n'

export function describeKeptStored(keptStored: KeptStored) {
  return i18n.t(
    'danmaku.alert.refetchKeptStored',
    'Fetched {{fetched}} comments, fewer than the {{stored}} already saved. Kept the saved danmaku.',
    {
      count: keptStored.fetchedCount,
      fetched: keptStored.fetchedCount,
      stored: keptStored.storedCount,
    }
  )
}
