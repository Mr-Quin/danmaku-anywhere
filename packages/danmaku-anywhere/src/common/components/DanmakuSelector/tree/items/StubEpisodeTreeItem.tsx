import {
  type BilibiliOf,
  type DanDanPlayOf,
  DanmakuSourceType,
  type EpisodeMeta,
  type EpisodeStub,
  type Season,
  type TencentOf,
  type WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { CloudDownload } from '@mui/icons-material'
import { CircularProgress, IconButton, Stack, Typography } from '@mui/material'
import type { ReactElement } from 'react'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'

interface StubEpisodeTreeItemProps {
  stub: EpisodeStub
  season: Season
  label: string
}

const buildFetchMeta = (
  stub: EpisodeStub,
  season: Season
): WithSeason<EpisodeMeta> => {
  const base = {
    title: stub.title,
    episodeNumber: stub.episodeNumber,
    indexedId: stub.indexedId,
    seasonId: season.id,
    season,
    schemaVersion: 4 as const,
    lastChecked: 0,
  }
  switch (stub.provider) {
    case DanmakuSourceType.DanDanPlay: {
      const typed = stub as DanDanPlayOf<EpisodeStub>
      return {
        ...base,
        provider: typed.provider,
        providerIds: typed.providerIds,
      } as DanDanPlayOf<WithSeason<EpisodeMeta>>
    }
    case DanmakuSourceType.Bilibili: {
      const typed = stub as BilibiliOf<EpisodeStub>
      return {
        ...base,
        provider: typed.provider,
        providerIds: typed.providerIds,
      } as BilibiliOf<WithSeason<EpisodeMeta>>
    }
    case DanmakuSourceType.Tencent: {
      const typed = stub as TencentOf<EpisodeStub>
      return {
        ...base,
        provider: typed.provider,
        providerIds: typed.providerIds,
      } as TencentOf<WithSeason<EpisodeMeta>>
    }
  }
}

export const StubEpisodeTreeItem = ({
  stub,
  season,
  label,
}: StubEpisodeTreeItemProps): ReactElement => {
  const fetchDanmaku = useFetchDanmaku()

  const handleFetch = (e: React.MouseEvent) => {
    e.stopPropagation()
    fetchDanmaku.mutate({
      type: 'by-meta',
      meta: buildFetchMeta(stub, season),
    })
  }

  return (
    <Stack
      direction="row"
      alignItems="center"
      width="100%"
      gap={1}
      py={0.5}
      overflow="hidden"
      pr={1}
    >
      <Typography noWrap variant="body2" color="text.disabled">
        {label}
      </Typography>
      <IconButton
        size="small"
        onClick={handleFetch}
        disabled={fetchDanmaku.isPending}
        sx={{ ml: 'auto' }}
      >
        {fetchDanmaku.isPending ? (
          <CircularProgress size={16} />
        ) : (
          <CloudDownload fontSize="small" color="action" />
        )}
      </IconButton>
    </Stack>
  )
}
