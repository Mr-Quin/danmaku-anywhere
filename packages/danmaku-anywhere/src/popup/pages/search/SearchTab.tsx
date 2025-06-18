import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import type { SearchEpisodesQuery } from '@danmaku-anywhere/danmaku-provider/ddp'
import { Box, Typography } from '@mui/material'
import {
  useIsFetching,
  useQueryErrorResetBoundary,
} from '@tanstack/react-query'
import { useEffect, useRef, useState, useTransition } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router'
import { Center } from '@/common/components/Center'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { SeasonSearchResult } from '@/common/components/MediaList/SeasonSearchResult'
import { SeasonSearchTabs } from '@/common/components/MediaList/SeasonSearchTabs'
import { isProvider } from '@/common/danmaku/utils'
import { useDanmakuSources } from '@/common/options/extensionOptions/useDanmakuSources'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { PopupSearchForm } from '@/popup/pages/search/components/PopupSearchForm'
import { useStore } from '@/popup/store'

export const SearchTab = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const search = useStore.use.search()

  // TODO: useTransition does not yet work with useSyncExternalStore (zustand),
  // so we use useState for now and save the state to the store
  const [searchParams, setSearchParams] = useState<
    SearchEpisodesQuery | undefined
  >(search.searchParams)

  const { enabledProviders } = useDanmakuSources()

  const ref = useRef<ErrorBoundary>(null)
  const { reset } = useQueryErrorResetBoundary()

  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (search.tab === undefined || !enabledProviders.includes(search.tab)) {
      search.setTab(enabledProviders[0])
    }
  }, enabledProviders)

  const isSearching =
    useIsFetching({
      queryKey: seasonQueryKeys.search(),
    }) > 0

  const handleSearch = (params: SearchEpisodesQuery) => {
    startTransition(() => {
      if (ref.current?.state.didCatch) {
        ref.current.resetErrorBoundary()
      }

      setSearchParams(params)
      search.setSearchParams(params)
    })
  }

  if (!enabledProviders.length) {
    return (
      <Center>
        <Typography>{t('searchPage.error.noProviders')}</Typography>
      </Center>
    )
  }

  if (search.tab === undefined) return null

  return (
    <>
      <Box p={2}>
        <PopupSearchForm
          onSearch={handleSearch}
          isLoading={isSearching || pending}
        />
      </Box>
      <ErrorBoundary
        ref={ref}
        onReset={reset}
        onError={console.error}
        fallbackRender={({ error }) => <ErrorMessage message={error.message} />}
      >
        {searchParams && (
          <>
            <SeasonSearchTabs
              providers={enabledProviders}
              selectedTab={search.tab}
              onTabChange={search.setTab}
            />
            <SeasonSearchResult
              searchParams={searchParams}
              provider={search.tab}
              onSeasonClick={(season) => {
                if (!isProvider(season, DanmakuSourceType.Custom)) {
                  search.setSeason(season)
                  navigate('season')
                }
              }}
              stale={pending}
            />
          </>
        )}
        <Outlet />
      </ErrorBoundary>
    </>
  )
}
