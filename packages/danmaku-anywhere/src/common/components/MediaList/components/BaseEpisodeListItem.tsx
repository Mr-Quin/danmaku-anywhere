import { Download, Update } from '@mui/icons-material'
import {
  Box,
  CircularProgress,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Tooltip,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { Suspense } from 'react'

import { CoverImage } from '@/common/components/MediaList/components/CoverImage'
import type { RenderEpisodeData } from '@/common/components/MediaList/types'
import { EpisodeMeta, WithSeason } from '@/common/danmaku/types/v4/schema'
import { useTranslation } from 'react-i18next'

interface BaseEpisodeListItemProps {
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
  showIcon = false,
  mutateDanmaku,
  data,
}: BaseEpisodeListItemProps) => {
  const { t } = useTranslation()
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
        {meta.imageUrl && (
          <Box width={40} mr={2} flexShrink={0}>
            <Suspense fallback={<Skeleton width={40} height={40} />}>
              <CoverImage src={meta.imageUrl} widthRatio={1} heightRatio={1} />
            </Suspense>
          </Box>
        )}
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
            secondary={
              danmaku
                ? `${new Date(danmaku.timeUpdated).toLocaleDateString()} -  ${t(
                    'danmaku.commentCounted',
                    {
                      count: danmaku.commentCount,
                    }
                  )}`
                : null
            }
          />
        </Tooltip>
        <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
          {getIcon()}
        </ListItemIcon>
      </ListItemButton>
    </ListItem>
  )
}
