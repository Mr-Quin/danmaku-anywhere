import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { Stack, Typography } from '@mui/material'
import type { ReactElement } from 'react'

interface EpisodeTreeItemProps {
  episode: GenericEpisodeLite
  onSelect: (episode: GenericEpisodeLite) => void
}

export const EpisodeTreeItem = ({
  episode,
}: EpisodeTreeItemProps): ReactElement => {
  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        width="100%"
        py={0.5}
        overflow="hidden"
        pr={1}
      >
        <Typography noWrap variant="body2" sx={{ flex: 1 }}>
          {episode.title}
        </Typography>
      </Stack>
    </>
  )
}
