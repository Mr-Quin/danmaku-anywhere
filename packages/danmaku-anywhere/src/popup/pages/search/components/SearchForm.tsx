import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/dandanplay-api'
import { LoadingButton } from '@mui/lab'
import { Box, Stack, TextField } from '@mui/material'

import { useSessionState } from '@/common/queries/extStorage/useSessionState'

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
        onSearch({ anime: title.trim(), episode: episodeNumber.trim() })
      }}
    >
      <Stack spacing={2}>
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          required
        />
        <TextField
          label="Episode"
          value={episodeNumber}
          onChange={(e) => setEpisodeNumber(e.target.value)}
          fullWidth
        />
        <LoadingButton
          type="submit"
          loading={isLoading}
          variant="contained"
          disabled={!title}
        >
          Search
        </LoadingButton>
      </Stack>
    </Box>
  )
}
