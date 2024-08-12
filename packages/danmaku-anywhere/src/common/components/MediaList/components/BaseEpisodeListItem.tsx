import { Download, Update } from '@mui/icons-material'
import {
  CircularProgress,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material'
import type { QueryKey } from '@tanstack/react-query'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import type { DanmakuCache } from '@/common/danmaku/models/danmakuCache/dto'

export interface BaseEpisodeListItemProps {
  episodeTitle: string
  tooltip?: string
  secondaryText?: (data: DanmakuCache) => ReactNode
  showIcon?: boolean
  queryKey: QueryKey
  queryDanmaku: () => Promise<DanmakuCache | null>
  mutateDanmaku: () => Promise<void>
}

export const BaseEpisodeListItem = ({
  episodeTitle,
  tooltip,
  secondaryText,
  showIcon = false,
  queryKey,
  queryDanmaku,
  mutateDanmaku,
}: BaseEpisodeListItemProps) => {
  const { data, isFetched, isLoading, isFetching } = useSuspenseQuery({
    queryKey,
    queryFn: queryDanmaku,
  })

  const { mutate, isPending: isMutating } = useMutation({
    mutationFn: mutateDanmaku,
  })

  const getIcon = () => {
    if (!showIcon) return null
    if (isFetching || isMutating) return <CircularProgress size={24} />
    if (isFetched && data) return <Update />
    return <Download />
  }

  return (
    <ListItem disablePadding>
      <ListItemButton onClick={() => mutate()} disabled={isLoading}>
        <ListItemIcon>{getIcon()}</ListItemIcon>
        <Tooltip
          title={tooltip ?? episodeTitle}
          enterDelay={500}
          placement="top"
        >
          <ListItemText
            primary={episodeTitle}
            primaryTypographyProps={{
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
            secondary={data ? secondaryText?.(data) : null}
          />
        </Tooltip>
      </ListItemButton>
    </ListItem>
  )
}
