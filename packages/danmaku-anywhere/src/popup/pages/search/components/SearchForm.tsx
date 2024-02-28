import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/danmaku-engine'
import { LoadingButton } from '@mui/lab'
import { Box, Stack, TextField, Typography } from '@mui/material'

import { useSessionState } from '@/common/hooks/extStorage/useSessionState'

export const SearchForm = ({
  onSearch,
  isLoading,
}: {
  onSearch: (params: DanDanAnimeSearchAPIParams) => void
  isLoading: boolean
}) => {
  const [title, setTitle] = useSessionState('', 'search/title')
  const [episodeNumber, setEpisodeNumber] = useSessionState(
    '',
    'search/episode'
  )

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch({ anime: title, episode: episodeNumber })
      }}
    >
      <Stack spacing={2}>
        <Typography variant="h6">Search for anime</Typography>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Anime Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            variant="standard"
            size="small"
            required
          />
          <TextField
            label="Episode"
            value={episodeNumber}
            onChange={(e) => setEpisodeNumber(e.target.value)}
            variant="standard"
            size="small"
          />
        </Stack>
        <LoadingButton type="submit" loading={isLoading} variant="outlined">
          Search
        </LoadingButton>
      </Stack>
    </Box>
  )
}
