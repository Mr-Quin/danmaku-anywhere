import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import type { SearchEpisodesQuery } from '@danmaku-anywhere/danmaku-provider/ddp'
import { Box, Collapse, Tab, Tabs, Typography } from '@mui/material'
import {
  useIsFetching,
  useQueryErrorResetBoundary,
} from '@tanstack/react-query'
import { useEffect, useRef, useState, useTransition } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'
import { Center } from '@/common/components/Center'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { ParseTabCore } from '@/common/components/ParseTabCore/ParseTabCore'
import { SearchForm } from '@/common/components/SearchForm'
import { SeasonSearchResult } from '@/common/components/Season/SeasonSearchResult'
import { SeasonSearchTabs } from '@/common/components/Season/SeasonSearchTabs'
import { isNotCustom } from '@/common/danmaku/utils'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { useAllSeasonMap } from '@/common/seasonMap/queries/useAllSeasonMap'
import { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { withStopPropagation } from '@/common/utils/withStopPropagation'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'
import { SeasonDetailsPage } from '@/content/controller/ui/floatingPanel/pages/search/SeasonDetailsPage'
import { useShowAddSeasonMapDialog } from './AddSeasonMapDialog'

export const SearchPage = (): React.ReactElement | null => {
  const { t } = useTranslation()
  const { searchTitle, setSearchTitle, providerTab, setProviderTab } =
    usePopup()
  const { mediaInfo } = useStore.use.integration()

  const {
    data: { searchUsingSimplified },
  } = useExtensionOptions()

  const { enabledProviders } = useProviderConfig()
  const { mountDanmaku } = useLoadDanmaku()
  const { data: seasonMaps } = useAllSeasonMap()

  const [localSearchUsingSimplified, setLocalSearchUsingSimplified] = useState(
    searchUsingSimplified
  )
  const [searchParams, setSearchParams] = useState<SearchEpisodesQuery>()
  const [scrollTop, setScrollTop] = useState(0)
  const [tab, setTab] = useState('search')
  const [selectedSeason, setSelectedSeason] = useState<
    Season | CustomSeason | undefined
  >()

  const showAddSeasonMapDialog = useShowAddSeasonMapDialog()

  const boxRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<ErrorBoundary>(null)
  const { reset } = useQueryErrorResetBoundary()

  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (
      providerTab === undefined ||
      !enabledProviders.some((provider) => provider.id === providerTab?.id)
    ) {
      setProviderTab(enabledProviders[0])
    }
  }, [enabledProviders])

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
    if (!mediaInfo) {
      return
    }

    setSearchTitle(mediaInfo.seasonTitle)
  }, [mediaInfo])

  const handleDialogProceed = (season: Season) => {
    setSelectedSeason(season)
  }

  const handleSearch = (searchTerm: string) => {
    startTransition(() => {
      if (errorRef.current?.state.didCatch) {
        errorRef.current.resetErrorBoundary()
      }

      setSearchParams({ anime: searchTerm })
    })
  }

  const handleSeasonClick = (season: Season | CustomSeason) => {
    if (boxRef.current) {
      setScrollTop(boxRef.current.scrollTop)
    }
    if (
      isNotCustom(season) &&
      mediaInfo &&
      !SeasonMap.hasMapping(
        seasonMaps,
        mediaInfo.getKey(),
        season.providerConfigId,
        season.id
      )
    ) {
      showAddSeasonMapDialog({
        season,
        mapKey: mediaInfo.getKey(),
        onProceed: handleDialogProceed,
      })
    } else {
      setSelectedSeason(season)
    }
  }

  if (!enabledProviders.length) {
    return (
      <Box flexGrow={1}>
        <Center>
          <Typography>
            {t(
              'searchPage.error.noProviders',
              'No danmaku sources enabled, please enable in settings'
            )}
          </Typography>
        </Center>
      </Box>
    )
  }

  if (!providerTab) return null

  if (selectedSeason)
    return (
      <SeasonDetailsPage
        season={selectedSeason}
        onGoBack={() => {
          setSelectedSeason(undefined)
        }}
      />
    )

  return (
    <TabLayout>
      <TabToolbar>
        <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)}>
          <Tab label={t('searchPage.name', 'Search Anime')} value="search" />
          <Tab label={t('searchPage.parse.name', 'Parse URL')} value="parse" />
        </Tabs>
      </TabToolbar>
      {tab === 'search' && (
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
          </Box>
          <ErrorBoundary
            ref={errorRef}
            onReset={reset}
            fallbackRender={({ error }) => (
              <ErrorMessage message={error.message} />
            )}
          >
            <Collapse in={!!searchParams} unmountOnExit>
              {searchParams && (
                <>
                  <SeasonSearchTabs
                    providers={enabledProviders}
                    selectedProvider={providerTab}
                    onTabChange={setProviderTab}
                  />
                  <SeasonSearchResult
                    searchParams={searchParams}
                    onSeasonClick={handleSeasonClick}
                    provider={providerTab}
                    stale={pending}
                  />
                </>
              )}
            </Collapse>
          </ErrorBoundary>
        </Box>
      )}
      {tab === 'parse' && (
        <ParseTabCore onImportSuccess={(episode) => mountDanmaku([episode])} />
      )}
    </TabLayout>
  )
}
