import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'
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

import { DanmakuProviderType } from '@/common/anime/enums'
import { mediaKeys } from '@/common/anime/queries/mediaQueryKeys'
import { Center } from '@/common/components/Center'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { SearchResultList } from '@/common/components/MediaList/SearchResultList'
import { hasIntegration } from '@/common/danmaku/enums'
import { stopKeyboardPropagation } from '@/common/utils/utils'
import { AutomaticMode } from '@/content/common/components/AutomaticMode'
import { usePopup } from '@/content/store/popupStore'
import { useStore } from '@/content/store/store'

export const SearchPanel = () => {
  const { t } = useTranslation()
  const { searchTitle, saveMapping, setSearchTitle, setSaveMapping } =
    usePopup()
  const mediaInfo = useStore((state) => state.mediaInfo)
  const integration = useStore((state) => state.integration)

  const [searchParams, setSearchParams] = useState<DanDanAnimeSearchAPIParams>()

  const ref = useRef<ErrorBoundary>(null)
  const { reset } = useQueryErrorResetBoundary()

  const [pending, startTransition] = useTransition()

  const isSearching =
    useIsFetching({
      queryKey: mediaKeys.search(),
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

  const getContext = () => {
    if (!mediaInfo || !saveMapping || !hasIntegration(integration))
      return undefined

    return {
      key: mediaInfo.key(),
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
              providers={[DanmakuProviderType.DanDanPlay]}
              searchParams={searchParams!}
              dense
              pending={pending}
              renderEpisode={(provider, episode, meta) => {
                if (provider === DanmakuProviderType.Bilibili) return null

                const { animeId, animeTitle } = meta

                return (
                  <EpisodeListItem
                    context={getContext()}
                    episodeId={episode.episodeId}
                    episodeTitle={episode.episodeTitle}
                    animeId={animeId}
                    animeTitle={animeTitle}
                    key={episode.episodeId}
                  />
                )
              }}
            />
          </Suspense>
        </Collapse>
      </ErrorBoundary>
    </Box>
  )
}
