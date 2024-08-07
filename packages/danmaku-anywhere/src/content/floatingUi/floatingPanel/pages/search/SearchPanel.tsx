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
import { useTranslation } from 'react-i18next'

import { EpisodeListItem } from './EpisodeListItem'

import { SearchResultList } from '@/common/components/AnimeList/SearchResultList'
import { Center } from '@/common/components/Center'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { hasIntegration } from '@/common/danmaku/enums'
import { stopKeyboardPropagation } from '@/common/utils/utils'
import { AutomaticMode } from '@/content/common/components/AutomaticMode'
import { usePopup } from '@/content/store/popupStore'
import { useStore } from '@/content/store/store'

export const SearchPanel = () => {
  const { t } = useTranslation()
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
    if (!mediaInfo || !saveMapping || !hasIntegration(integration))
      return undefined

    return {
      originalTitle: mediaInfo.toTitleString(),
      title: animeTitle,
      animeId: animeId,
      integration,
    }
  }

  const handleTextFieldKeyDown = (e: KeyboardEvent) => {
    stopKeyboardPropagation(e)
  }

  return (
    <Box flexGrow={1} sx={{ overflowX: 'hidden' }}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSearch()
        }}
      >
        <Box py={2} px={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label={t('searchPage.title')}
              variant="outlined"
              value={searchTitle}
              onKeyDown={handleTextFieldKeyDown}
              onKeyPress={handleTextFieldKeyDown} // required for stopPropagation
              onChange={(e) => {
                setSearchTitle(e.target.value)
              }}
              fullWidth
              required
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
          <AutomaticMode>
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
                label={t('searchPage.saveMapping')}
              />
            </FormControl>
          </AutomaticMode>
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
