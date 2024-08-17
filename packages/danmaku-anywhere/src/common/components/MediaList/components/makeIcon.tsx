import { BiliBiliMediaType } from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { DanDanAnimeType } from '@danmaku-anywhere/danmaku-provider/ddp'

import { CNFlagIcon } from '@/common/components/icons/CNFlagIcon'

export const getDanDanPlayMediaIcon = (type: DanDanAnimeType) => {
  switch (type) {
    case 'jpdrama':
      return '🎭'
    case 'tvseries':
      return '📺'
    case 'movie':
      return '🎬'
    case 'ova':
      return '📀'
    case 'web':
      return '🌐'
    case 'musicvideo':
      return '🎵'
    default:
      return '❓'
  }
}

export const getBilibiliMediaIcon = (type: BiliBiliMediaType) => {
  switch (type) {
    case BiliBiliMediaType.Variety:
      return '🤹‍♀️'
    case BiliBiliMediaType.Bangumi:
    case BiliBiliMediaType.TV:
      return '📺'
    case BiliBiliMediaType.Movie:
      return '🎬'
    case BiliBiliMediaType.Documentary:
      return '🔎'
    case BiliBiliMediaType.Guochuang:
      return <CNFlagIcon />
    default:
      return '❓'
  }
}
