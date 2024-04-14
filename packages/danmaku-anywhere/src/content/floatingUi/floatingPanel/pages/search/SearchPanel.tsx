import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/dandanplay-api'
import { Search } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'
import {
  Box,
  Checkbox,
  Collapse,
  Divider,
  FormControl,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  useIsFetching,
  useQueryErrorResetBoundary,
} from '@tanstack/react-query'
import type { KeyboardEvent } from 'react'
import { Suspense, useEffect, useRef, useState, useTransition } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { usePopup } from '../../../../store/popupStore'
import { useStore } from '../../../../store/store'

import { EpisodeListItem } from './EpisodeListItem'

import { SearchResultList } from '@/common/components/animeList/SearchResultList'
import { Center } from '@/common/components/Center'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'

export const SearchPanel = () => {
  const {
    searchTitle,
    saveMapping,
    setAnimes,
    setSearchTitle,
    setSaveMapping,
  } = usePopup()
  const mediaInfo = useStore((state) => state.mediaInfo)
  const integration = useStore((state) => state.integration)

  const [searchParams, setSearchParams] = useState<DanDanAnimeSearchAPIParams>()

  const ref = useRef<ErrorBoundary>(null)
  const { reset } = useQueryErrorResetBoundary()

  const [pending, startTransition] = useTransition()

  const isSearching =
    useIsFetching({
      queryKey: ['anime', 'search', searchParams],
    }) > 0

  useEffect(() => {
    if (!mediaInfo) return

    setSearchTitle(mediaInfo.title)
  }, [mediaInfo])

  const handleSearch = () => {
    startTransition(() => {
      if (ref.current?.state.didCatch) {
        ref.current.resetErrorBoundary()
      }

      setSearchParams({ anime: searchTitle })
    })
  }

  const getTitleMapping = (animeTitle: string, animeId: number) => {
    if (!mediaInfo || !saveMapping || !integration) return undefined

    return {
      originalTitle: mediaInfo.toTitleString(),
      title: animeTitle,
      animeId: animeId,
      source: integration,
    }
  }

  const handleTextFieldKeyDown = (e: KeyboardEvent) => {
    // prevent keydown event from triggering global shortcuts
    if (e.key === 'Escape') return
    e.stopPropagation()
  }

  return (
    <Box>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSearch()
        }}
      >
        <Box py={2} px={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="Anime Title"
              variant="outlined"
              value={searchTitle}
              onKeyDown={handleTextFieldKeyDown}
              onKeyPress={handleTextFieldKeyDown} // required for stopPropagation
              onChange={(e) => {
                setSearchTitle(e.target.value)
              }}
              fullWidth
            />
            <LoadingButton
              type="submit"
              loading={isSearching || pending}
              disabled={searchTitle.length === 0}
              variant="contained"
            >
              <Search />
            </LoadingButton>
          </Stack>
          <FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  inputProps={{ 'aria-label': 'controlled' }}
                  checked={saveMapping}
                  onChange={(e) => {
                    setSaveMapping(e.target.checked)
                  }}
                />
              }
              label="Remember selection"
            />
          </FormControl>
        </Box>
      </form>
      <ErrorBoundary
        ref={ref}
        onReset={reset}
        fallbackRender={({ error }) => (
          <Center>
            <Typography>There was an error!</Typography>
            <Typography color={(theme) => theme.palette.error.main}>
              {error.message}
            </Typography>
          </Center>
        )}
      >
        <Collapse in={searchParams !== undefined} unmountOnExit>
          <Suspense fallback={<FullPageSpinner />}>
            <Divider />
            <SearchResultList
              searchParams={searchParams!}
              dense
              pending={pending}
              onLoad={(data) => {
                setAnimes(data)
              }}
              renderEpisodes={(episodes, anime) => {
                return episodes.map((episode) => (
                  <EpisodeListItem
                    titleMapping={getTitleMapping(
                      anime.animeTitle,
                      anime.animeId
                    )}
                    episodeId={episode.episodeId}
                    episodeTitle={episode.episodeTitle}
                    animeId={anime.animeId}
                    animeTitle={anime.animeTitle}
                    key={episode.episodeId}
                  />
                ))
              }}
            />
          </Suspense>
        </Collapse>
      </ErrorBoundary>
    </Box>
  )
}
