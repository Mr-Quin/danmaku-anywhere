import type { DanDanAnime } from '@danmaku-anywhere/dandanplay-api'
import { ListItemIcon, Tooltip } from '@mui/material'

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
