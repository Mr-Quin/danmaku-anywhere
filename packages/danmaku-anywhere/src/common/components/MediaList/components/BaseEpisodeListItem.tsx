import { Download, Update } from '@mui/icons-material'
import {
  CircularProgress,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { match } from 'ts-pattern'

import type { RenderEpisodeData } from '@/common/components/MediaList/types'
import type { DanmakuFetchDto, DanmakuGetOneDto } from '@/common/danmaku/dto'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { Danmaku } from '@/common/danmaku/models/danmaku'
import type { BiliBiliMeta, DanDanPlayMeta } from '@/common/danmaku/models/meta'
import { danmakuKeys } from '@/common/danmaku/queries/danmakuQueryKeys'
import { UnsupportedProviderException } from '@/common/danmaku/UnsupportedProviderException'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

interface BaseEpisodeListItemProps {
  renderSecondaryText?: (data: Danmaku) => ReactNode
  showIcon?: boolean
  mutateDanmaku: (meta: DanmakuFetchDto['meta']) => Promise<unknown>
  data: RenderEpisodeData
}

interface EpisodeRenderData {
  meta: DanmakuFetchDto['meta']
  params: DanmakuGetOneDto
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

      const params = {
        provider: DanmakuSourceType.DanDanPlay,
        episodeId: episode.episodeId,
      }

      return {
        meta,
        title: episodeTitle,
        tooltip: episodeTitle,
        params,
      }
    })
    .with({ provider: DanmakuSourceType.Bilibili }, ({ episode, season }) => {
      const meta = {
        cid: episode.cid,
        aid: episode.aid,
        seasonId: season.season_id,
        title: episode.long_title || episode.share_copy,
        seasonTitle: season.title,
        mediaType: season.type,
        provider: DanmakuSourceType.Bilibili,
      } satisfies BiliBiliMeta

      const params = {
        provider: DanmakuSourceType.Bilibili,
        episodeId: episode.cid,
      }

      return {
        meta,
        title: episode.long_title || episode.share_copy,
        tooltip: episode.share_copy,
        params,
      }
    })
    .otherwise(({ provider }) => {
      throw new UnsupportedProviderException(provider)
    })

export const BaseEpisodeListItem = ({
  renderSecondaryText,
  showIcon = false,
  mutateDanmaku,
  data,
}: BaseEpisodeListItemProps) => {
  const { meta, params, title, tooltip } = getRenderData(data)

  const {
    data: danmakuData,
    isFetched,
    isLoading,
    isFetching,
  } = useSuspenseQuery({
    queryKey: danmakuKeys.one(params),
    queryFn: async () => chromeRpcClient.danmakuGetOne(params),
  })

  const { mutate, isPending: isMutating } = useMutation({
    mutationFn: mutateDanmaku,
  })

  const getIcon = () => {
    if (!showIcon) return null
    if (isFetching || isMutating) return <CircularProgress size={24} />
    if (isFetched && danmakuData) return <Update />
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
            secondary={danmakuData ? renderSecondaryText?.(danmakuData) : null}
          />
        </Tooltip>
      </ListItemButton>
    </ListItem>
  )
}
