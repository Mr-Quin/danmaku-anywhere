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
import { match } from 'ts-pattern'

import type { RenderEpisodeData } from '@/common/components/MediaList/types'
import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanmakuLite } from '@/common/danmaku/models/danmaku'
import type {
  BiliBiliMeta,
  DanDanPlayMeta,
  TencentMeta,
} from '@/common/danmaku/models/meta'
import { stripHtml } from '@/common/utils/utils'

interface BaseEpisodeListItemProps {
  renderSecondaryText?: (data: DanmakuLite) => ReactNode
  showIcon?: boolean
  mutateDanmaku: (meta: DanmakuFetchDto['meta']) => Promise<unknown>
  data: RenderEpisodeData
}

interface EpisodeRenderData {
  meta: DanmakuFetchDto['meta']
  title: string
  tooltip: string
}

const getRenderData = (data: RenderEpisodeData): EpisodeRenderData =>
  match(data)
    .with({ provider: DanmakuSourceType.DanDanPlay }, ({ episode, season }) => {
      const { episodeTitle, episodeId } = episode
      const { animeId, animeTitle } = season

      const meta = {
        episodeId,
        episodeTitle,
        animeId: animeId,
        animeTitle: animeTitle,
        provider: DanmakuSourceType.DanDanPlay,
      } satisfies DanDanPlayMeta

      return {
        meta,
        title: episodeTitle,
        tooltip: episodeTitle,
      }
    })
    .with({ provider: DanmakuSourceType.Bilibili }, ({ episode, season }) => {
      const meta = {
        cid: episode.cid,
        aid: episode.aid,
        seasonId: season.season_id,
        title: episode.long_title || episode.share_copy,
        seasonTitle: season.title,
        mediaType: season.media_type,
        provider: DanmakuSourceType.Bilibili,
      } satisfies BiliBiliMeta

      return {
        meta,
        title: episode.long_title || episode.share_copy,
        tooltip: episode.share_copy,
      }
    })
    .with({ provider: DanmakuSourceType.Tencent }, ({ episode, season }) => {
      const meta = {
        vid: episode.vid,
        episodeTitle: episode.play_title,
        cid: season.doc.id,
        seasonTitle: stripHtml(season.videoInfo.title),
        provider: DanmakuSourceType.Tencent,
      } satisfies TencentMeta

      return {
        meta,
        title: episode.play_title,
        tooltip: episode.play_title,
      }
    })
    .exhaustive()

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
            primaryTypographyProps={{
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
            secondary={danmaku ? renderSecondaryText?.(danmaku) : null}
          />
        </Tooltip>
      </ListItemButton>
    </ListItem>
  )
}
