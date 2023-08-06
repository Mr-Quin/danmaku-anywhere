import { DanDanAnime, searchAnime } from '@danmaku-anywhere/danmaku-engine'
import { LoadingButton } from '@mui/lab'
import { Box, Stack, TextField } from '@mui/material'
import { useEffect } from 'react'
import { useStore } from './store'
import { popupLogger } from '@/common/logger'
import { useSessionState } from '@/common/hooks/useSessionState'
import { useAsyncLifecycle } from '@/common/hooks/useAsyncLifecycle'

export const SearchForm = () => {
  const [title, setTitle] = useSessionState('', 'search/title')
  const [episodeNumber, setEpisodeNumber] = useSessionState(
    '',
    'search/episode'
  )
  const [cachedResults, setCachedResults] = useSessionState<DanDanAnime[]>(
    [],
    'search/animeSearchResults'
  )
  const [{ isLoading }, dispatch] = useAsyncLifecycle<DanDanAnime[] | null>(
    null
  )

  useEffect(() => {
    useStore.setState({ animeSearchResults: cachedResults })
  }, [cachedResults])

  const handleSearch = async () => {
    dispatch({ type: 'LOADING' })
    try {
      const result = await searchAnime({
        anime: title,
        episode: episodeNumber,
      })
      if (result.success) {
        dispatch({ type: 'SET', payload: result.animes })
        setCachedResults(result.animes)
        popupLogger.log(result)
      } else {
        dispatch({ type: 'ERROR', payload: result.errorMessage })
        popupLogger.error(result.errorMessage)
      }
    } catch (e) {
      dispatch({ type: 'ERROR', payload: e })
    }
  }

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        handleSearch()
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1}>
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
        <LoadingButton
          type="submit"
          loading={isLoading}
          variant="outlined"
          size="small"
        >
          Search
        </LoadingButton>
      </Stack>
    </Box>
  )
}
