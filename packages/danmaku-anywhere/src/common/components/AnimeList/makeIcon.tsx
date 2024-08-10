import type { DanDanAnimeType } from '@danmaku-anywhere/danmaku-provider/ddp'
import { Icon } from '@mui/material'

const getAnimeIcon = (type: DanDanAnimeType) => {
  switch (type) {
    case 'jpdrama':
      return '🎭'
    case 'tvseries':
      return '📺'
    case 'movie':
      return '🎬'
    case 'ova':
      return '📼'
    case 'web':
      return '🌐'
    case 'musicvideo':
      return '🎵'
    default:
      return '❓'
  }
}
export const makeAnimeIcon = (type: DanDanAnimeType) => {
  return (
    <Icon
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {getAnimeIcon(type)}
    </Icon>
  )
}
