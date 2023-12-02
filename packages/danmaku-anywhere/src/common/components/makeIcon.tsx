import { DanDanAnime } from '@danmaku-anywhere/danmaku-engine'
import { Icon } from '@mui/material'

const getAnimeIcon = (type: DanDanAnime['type']) => {
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
export const makeAnimeIcon = (type: DanDanAnime['type']) => {
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
