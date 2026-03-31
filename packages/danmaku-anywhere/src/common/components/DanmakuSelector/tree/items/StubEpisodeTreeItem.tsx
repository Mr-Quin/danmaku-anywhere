import type { EpisodeStub, Season } from '@danmaku-anywhere/danmaku-converter'
import { CloudDownload } from '@mui/icons-material'
import { CircularProgress, IconButton, Stack, Typography } from '@mui/material'
import type { ReactElement } from 'react'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'

interface StubEpisodeTreeItemProps {
  stub: EpisodeStub
  season: Season
  label: string
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
      type: 'by-stub',
      stub,
      seasonId: season.id,
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
