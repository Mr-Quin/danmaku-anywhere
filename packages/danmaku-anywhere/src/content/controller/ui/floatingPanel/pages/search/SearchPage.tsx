import type { SearchEpisodesQuery } from '@danmaku-anywhere/danmaku-provider/ddp'
import {
  Box,
  Collapse,
  Divider,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material'
import {
  useIsFetching,
  useQueryErrorResetBoundary,
} from '@tanstack/react-query'
import { Suspense, useEffect, useRef, useState, useTransition } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'

import { EpisodeListItem } from './EpisodeListItem'

import { Center } from '@/common/components/Center'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { SearchResultList } from '@/common/components/MediaList/SearchResultList'
import { SearchForm } from '@/common/components/SearchForm'
import { useDanmakuSources } from '@/common/options/extensionOptions/useDanmakuSources'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { mediaQueryKeys } from '@/common/queries/queryKeys'
import { withStopPropagation } from '@/common/utils/withStopPropagation'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'

export const SearchPage = () => {
  const { t } = useTranslation()
  const { searchTitle, saveMapping, setSearchTitle, setSaveMapping } =
    usePopup()
  const { mediaInfo } = useStore.use.integration()

  const {
    data: { searchUsingSimplified },
  } = useExtensionOptions()

  const { enabledProviders } = useDanmakuSources()

  const [localSearchUsingSimplified, setLocalSearchUsingSimplified] = useState(
    searchUsingSimplified,
  )
  const [searchParams, setSearchParams] = useState<SearchEpisodesQuery>()

  const ref = useRef<ErrorBoundary>(null)
  const { reset } = useQueryErrorResetBoundary()

  const [pending, startTransition] = useTransition()

  const isSearching =
    useIsFetching({
      queryKey: mediaQueryKeys.search(),
    }) > 0

  useEffect(() => {
    if (!mediaInfo) return

    setSearchTitle(mediaInfo.seasonTitle)
  }, [mediaInfo])

  const handleSearch = (searchTerm: string) => {
    startTransition(() => {
      if (ref.current?.state.didCatch) {
        ref.current.resetErrorBoundary()
      }

      setSearchParams({ anime: searchTerm })
    })
  }

  const getSeasonMapKey = () => {
    if (!mediaInfo || !saveMapping) return undefined

    return `${mediaInfo.fullSeason()}`
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

  return (
    <Box flexGrow={1} sx={{ overflowX: 'hidden' }}>
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
        ref={ref}
        onReset={reset}
        fallbackRender={({ error }) => (
          <Center>
            <Typography>There was an error!</Typography>
            <Typography color="error">{error.message}</Typography>
          </Center>
        )}
      >
        <Collapse in={searchParams !== undefined} unmountOnExit>
          <Suspense fallback={<FullPageSpinner />}>
            <Divider />
            <SearchResultList
              providers={enabledProviders}
              searchParams={searchParams!}
              dense
              pending={pending}
              renderEpisode={(data) => {
                return <EpisodeListItem seasonMapKey={getSeasonMapKey()} data={data} />
              }}
            />
          </Suspense>
        </Collapse>
      </ErrorBoundary>
    </Box>
  )
}
