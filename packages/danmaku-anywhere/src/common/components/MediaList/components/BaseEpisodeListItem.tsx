import { Download, Update } from '@mui/icons-material'
import {
  CircularProgress,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import type { RenderEpisodeData } from '@/common/components/MediaList/types'
import {
  EpisodeLiteV4,
  EpisodeMeta,
  WithSeason,
} from '@/common/danmaku/types/v4/schema'

interface BaseEpisodeListItemProps {
  renderSecondaryText?: (data: EpisodeLiteV4) => ReactNode
  showIcon?: boolean
  mutateDanmaku: (meta: WithSeason<EpisodeMeta>) => Promise<unknown>
  data: RenderEpisodeData
}

interface EpisodeRenderData {
  meta: WithSeason<EpisodeMeta>
  title: string
  tooltip: string
}

const getRenderData = (data: RenderEpisodeData): EpisodeRenderData => {
  return {
    meta: data.episode,
    title: data.episode.title,
    tooltip: data.episode.title,
  }
}

export const BaseEpisodeListItem = ({
  renderSecondaryText,
  showIcon = false,
  mutateDanmaku,
  data,
}: BaseEpisodeListItemProps) => {
  const { danmaku, isLoading } = data
  const { meta, title, tooltip } = getRenderData(data)

  const { mutate, isPending: isMutating } = useMutation({
    mutationFn: mutateDanmaku,
  })

  const getIcon = () => {
    if (!showIcon) return null
    if (isLoading || isMutating) return <CircularProgress size={24} />
    if (danmaku) return <Update />
    return <Download />
  }

  return (
    <ListItem disablePadding>
      <ListItemButton onClick={() => mutate(meta)} disabled={isLoading}>
        <ListItemIcon>{getIcon()}</ListItemIcon>
        <Tooltip title={tooltip} enterDelay={500} placement="top">
          <ListItemText
            primary={title}
            slotProps={{
              primary: {
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              },
            }}
            secondary={danmaku ? renderSecondaryText?.(danmaku) : null}
          />
        </Tooltip>
      </ListItemButton>
    </ListItem>
  )
}
