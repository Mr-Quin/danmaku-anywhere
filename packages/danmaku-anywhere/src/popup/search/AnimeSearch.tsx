import { searchAnime } from '@danmaku-anywhere/danmaku-engine'
import { LoadingButton } from '@mui/lab'
import { Box, Stack, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useStore } from '../store'

import { useSessionState } from '@/common/hooks/useSessionState'

export const AnimeSearch = () => {
  const [title, setTitle] = useSessionState('', 'search/title')
  const [episodeNumber, setEpisodeNumber] = useSessionState(
    '',
    'search/episode'
  )

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ['search', { title, episodeNumber }],
    queryFn: async () => {
      return searchAnime({
        anime: title,
        episode: episodeNumber,
      })
    },
    enabled: false,
    select: (result) => {
      return result.animes
    },
    staleTime: Infinity,
  })

  useEffect(() => {
    useStore.setState({ animeSearchResults: data ?? [] })
  }, [data])

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        refetch()
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
        {error && <Typography color="error">{error.message}</Typography>}
        <LoadingButton type="submit" loading={isLoading} variant="outlined">
          Search
        </LoadingButton>
      </Stack>
    </Box>
  )
}
