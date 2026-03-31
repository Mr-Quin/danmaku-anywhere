import type {
  EpisodeMeta,
  EpisodeStub,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { CloudDownload } from '@mui/icons-material'
import { CircularProgress, IconButton, Stack, Typography } from '@mui/material'
import type { ReactElement } from 'react'
import { useGetAllSeasonsSuspense } from '@/common/anime/queries/useGetAllSeasonsSuspense'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'

interface StubEpisodeTreeItemProps {
  stub: EpisodeStub
  seasonId: number
  label: string
}

const buildFetchMeta = (
  stub: EpisodeStub,
  season: Season
): WithSeason<EpisodeMeta> => {
  return {
    ...stub,
    seasonId: season.id,
    season,
    schemaVersion: 4,
    lastChecked: 0,
  } as WithSeason<EpisodeMeta>
}

export const StubEpisodeTreeItem = ({
  stub,
  seasonId,
  label,
}: StubEpisodeTreeItemProps): ReactElement => {
  const fetchDanmaku = useFetchDanmaku()
  const { data: seasons } = useGetAllSeasonsSuspense()
  const season = seasons.find((s) => s.id === seasonId)

  const handleFetch = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!season) {
      return
    }
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
