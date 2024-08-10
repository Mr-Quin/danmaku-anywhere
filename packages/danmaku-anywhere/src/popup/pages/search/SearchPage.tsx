import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/danmaku-provider'
import { Box, Collapse, Typography } from '@mui/material'
import {
  useIsFetching,
  useQueryErrorResetBoundary,
} from '@tanstack/react-query'
import { Suspense, useEffect, useRef, useState, useTransition } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'

import { EpisodeListItem } from './components/EpisodeListItem'
import { SearchForm } from './components/SearchForm'

import { SearchResultList } from '@/common/components/AnimeList/SearchResultList'
import { Center } from '@/common/components/Center'
import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'
import { useStore } from '@/popup/store'

export const SearchPage = () => {
  const { t } = useTranslation()
  // TODO: useTransition does not yet work with useSyncExternalStore (zustand),
  // so we use useState for now and save the state to the store
  const [searchParams, setSearchParams] = useState<DanDanAnimeSearchAPIParams>()

  const ref = useRef<ErrorBoundary>(null)
  const { reset } = useQueryErrorResetBoundary()

  const savedSearchParams = useStore.use.animeSearchParams?.()

  const [pending, startTransition] = useTransition()

  const isSearching =
    useIsFetching({
      queryKey: ['anime', 'search', searchParams],
    }) > 0

  useEffect(() => {
    if (savedSearchParams) {
      setSearchParams(savedSearchParams)
    }
  }, [])

  const handleSearch = (params: DanDanAnimeSearchAPIParams) => {
    startTransition(() => {
      if (ref.current?.state.didCatch) {
        ref.current.resetErrorBoundary()
      }

      setSearchParams(params)
      useStore.setState({ animeSearchParams: params })
    })
  }

  return (
    <TabLayout>
      <TabToolbar title={t('searchPage.name')} />
      <Box p={2}>
        <SearchForm
          onSearch={handleSearch}
          isLoading={isSearching || pending}
        />
      </Box>
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
        <Collapse in={searchParams !== undefined} unmountOnExit mountOnEnter>
          <Suspense fallback={null}>
            <SearchResultList
              pending={pending}
              searchParams={searchParams!}
              dense
              renderEpisodes={(episodes, result) => {
                return episodes.map((episode) => (
                  <EpisodeListItem
                    episodeId={episode.episodeId}
                    episodeTitle={episode.episodeTitle}
                    animeId={result.animeId}
                    animeTitle={result.animeTitle}
                    key={episode.episodeId}
                  />
                ))
              }}
            />
          </Suspense>
        </Collapse>
      </ErrorBoundary>
    </TabLayout>
  )
}
