import { ListItemIcon, Tooltip } from '@mui/material'
import { DanDanAnime } from '@danmaku-anywhere/danmaku-engine'
import { makeAnimeIcon } from './makeIcon'

interface AnimeTypeIconProps {
  type: DanDanAnime['type']
  typeDescription: string
}

export const AnimeTypeIcon = ({
  type,
  typeDescription,
}: AnimeTypeIconProps) => {
  return (
    <Tooltip title={typeDescription} disableFocusListener disableTouchListener>
      <ListItemIcon>{makeAnimeIcon(type)}</ListItemIcon>
    </Tooltip>
  )
}
