import { BilibiliMediaType } from '@danmaku-anywhere/danmaku-provider/bilibili'
import type { AnimeType } from '@danmaku-anywhere/danmaku-provider/ddp'
import { TencentVideoType } from '@danmaku-anywhere/danmaku-provider/tencent'

import { CNFlagIcon } from '@/common/components/icons/CNFlagIcon'

export const getDanDanPlayMediaIcon = (type: AnimeType) => {
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

export const getBilibiliMediaIcon = (type: BilibiliMediaType) => {
  switch (type) {
    case BilibiliMediaType.Variety:
      return '🤹‍♀️'
    case BilibiliMediaType.Bangumi:
    case BilibiliMediaType.TV:
      return '📺'
    case BilibiliMediaType.Movie:
      return '🎬'
    case BilibiliMediaType.Documentary:
      return '🔎'
    case BilibiliMediaType.Guochuang:
      return <CNFlagIcon />
    default:
      return '❓'
  }
}
export const getTencentMediaIcon = (type: TencentVideoType) => {
  switch (type) {
    case TencentVideoType.Variety:
      return '🤹‍♀️'
    case TencentVideoType.Anime:
      return '📺'
    case TencentVideoType.Drama:
      return '🎭'
    case TencentVideoType.Original:
      return <CNFlagIcon />
    case TencentVideoType.Documentary:
      return '🔎'
    case TencentVideoType.Movie:
      return '🎬'
    default:
      return '❓'
  }
}
