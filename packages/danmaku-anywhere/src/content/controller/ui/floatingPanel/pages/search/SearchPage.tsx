import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import type { SearchEpisodesQuery } from '@danmaku-anywhere/danmaku-provider/ddp'
import {
  Box,
  Collapse,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material'
import {
  useIsFetching,
  useQueryErrorResetBoundary,
} from '@tanstack/react-query'
import { useEffect, useRef, useState, useTransition } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'
import { Center } from '@/common/components/Center'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { SeasonSearchResult } from '@/common/components/MediaList/SeasonSearchResult'
import { SeasonSearchTabs } from '@/common/components/MediaList/SeasonSearchTabs'
import { SearchForm } from '@/common/components/SearchForm'
import { isProvider } from '@/common/danmaku/utils'
import { useDanmakuSources } from '@/common/options/extensionOptions/useDanmakuSources'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { withStopPropagation } from '@/common/utils/withStopPropagation'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'
import { SeasonDetailsPage } from '@/content/controller/ui/floatingPanel/pages/search/SeasonDetailsPage'

export const SearchPage = () => {
  const { t } = useTranslation()
  const {
    searchTitle,
    saveMapping,
    setSearchTitle,
    setSaveMapping,
    providerTab,
    setProviderTab,
    selectedSeason,
    setSelectedSeason,
  } = usePopup()
  const { mediaInfo } = useStore.use.integration()

  const {
    data: { searchUsingSimplified },
  } = useExtensionOptions()

  const { enabledProviders } = useDanmakuSources()

  const [localSearchUsingSimplified, setLocalSearchUsingSimplified] = useState(
    searchUsingSimplified
  )
  const [searchParams, setSearchParams] = useState<SearchEpisodesQuery>()
  const [scrollTop, setScrollTop] = useState(0)

  const boxRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<ErrorBoundary>(null)
  const { reset } = useQueryErrorResetBoundary()

  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (providerTab === undefined || !enabledProviders.includes(providerTab)) {
      setProviderTab(enabledProviders[0])
    }
  }, enabledProviders)

  useEffect(() => {
    if (!selectedSeason) {
      boxRef.current?.scrollTo(0, scrollTop)
    }
  }, [selectedSeason])

  const isSearching =
    useIsFetching({
      queryKey: seasonQueryKeys.search(),
    }) > 0

  useEffect(() => {
    if (!mediaInfo) return

    setSearchTitle(mediaInfo.seasonTitle)
  }, [mediaInfo])

  const handleSearch = (searchTerm: string) => {
    startTransition(() => {
      if (errorRef.current?.state.didCatch) {
        errorRef.current.resetErrorBoundary()
      }

      setSearchParams({ anime: searchTerm })
    })
  }

  const getSeasonMapKey = () => {
    if (!mediaInfo || !saveMapping) return undefined

    return `${mediaInfo.getKey()}`
  }

  if (!enabledProviders.length) {
    return (
      <Box flexGrow={1}>
        <Center>
          <Typography>{t('searchPage.error.noProviders')}</Typography>
        </Center>
      </Box>
    )
  }

  if (!providerTab) return null

  if (selectedSeason)
    return <SeasonDetailsPage seasonMapKey={getSeasonMapKey()} />

  return (
    <Box ref={boxRef} flexGrow={1} sx={{ overflowX: 'hidden' }}>
      <Box py={2} px={2}>
        <SearchForm
          onSearch={handleSearch}
          isLoading={isSearching || pending}
          useSimplified={localSearchUsingSimplified}
          onSimplifiedChange={(on) => {
            setLocalSearchUsingSimplified(on)
          }}
          searchTerm={searchTitle}
          onSearchTermChange={setSearchTitle}
          textFieldProps={{ ...withStopPropagation() }}
        />
        {!!mediaInfo && (
          <FormControlLabel
            control={
              <Switch
                checked={saveMapping}
                onChange={(e) => {
                  setSaveMapping(e.target.checked)
                }}
              />
            }
            label={t('searchPage.saveMapping')}
          />
        )}
      </Box>
      <ErrorBoundary
        ref={errorRef}
        onReset={reset}
        fallbackRender={({ error }) => <ErrorMessage message={error.message} />}
      >
        <Collapse in={!!searchParams} unmountOnExit>
          {searchParams && (
            <>
              <SeasonSearchTabs
                providers={enabledProviders}
                selectedTab={providerTab}
                onTabChange={setProviderTab}
              />
              <SeasonSearchResult
                searchParams={searchParams}
                onSeasonClick={(season) => {
                  if (boxRef.current) {
                    setScrollTop(boxRef.current.scrollTop)
                  }
                  if (!isProvider(season, DanmakuSourceType.Custom)) {
                    setSelectedSeason(season)
                  }
                }}
                provider={providerTab}
                stale={pending}
              />
            </>
          )}
        </Collapse>
      </ErrorBoundary>
    </Box>
  )
}
