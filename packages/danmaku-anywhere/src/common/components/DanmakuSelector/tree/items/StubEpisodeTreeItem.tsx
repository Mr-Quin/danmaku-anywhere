import type { EpisodeStub, Season } from '@danmaku-anywhere/danmaku-converter'
import { CloudDownload } from '@mui/icons-material'
import { CircularProgress, Stack, Typography } from '@mui/material'
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (fetchDanmaku.isPending) {
      return
    }
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
      onClick={handleClick}
      sx={{ cursor: 'pointer' }}
    >
      <Typography noWrap variant="body2" color="text.disabled">
        {label}
      </Typography>
      {fetchDanmaku.isPending ? (
        <CircularProgress size={16} sx={{ ml: 'auto', flexShrink: 0 }} />
      ) : (
        <CloudDownload
          fontSize="small"
          color="action"
          sx={{ ml: 'auto', flexShrink: 0 }}
        />
      )}
    </Stack>
  )
}
