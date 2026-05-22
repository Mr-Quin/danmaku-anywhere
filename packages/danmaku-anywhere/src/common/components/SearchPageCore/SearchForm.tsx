import type {
  CustomSeason,
  Episode,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Download, Search } from '@mui/icons-material'
import { Box, Button, Stack, Typography } from '@mui/material'
import { useQueries } from '@tanstack/react-query'
import { type ReactNode, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { searchSeasonForProvider } from '@/common/anime/queries/searchSeasonForProvider'
import { ScrollBox } from '@/common/components/layout/ScrollBox'
import { NothingHere } from '@/common/components/NothingHere'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { useSearchHistory } from '@/common/options/searchHistory/useSearchHistory'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { toSimplified } from '@/common/utils/utils'
import { SearchInput } from './SearchInput'
import { SearchMascot } from './SearchMascot'
import { SeasonResultsList } from './SeasonResultsList'
import { SourceFilterChips } from './SourceFilterChips'
import { isParseableUrl, UrlParseSection } from './UrlParseSection'

type SeasonOrInsert = Season | SeasonInsert | CustomSeason

interface SearchFormProps {
  searchTerm: string
  onSearchTermChange: (term: string) => void
  onSeasonClick: (season: SeasonOrInsert, provider: ProviderConfig) => void
  onImportSuccess?: (episode: WithSeason<Episode>) => void
  focusToken?: number
}

export function SearchForm({
  searchTerm,
  onSearchTermChange,
  onSeasonClick,
  onImportSuccess,
  focusToken,
}: SearchFormProps) {
  const { t } = useTranslation()

  const { data: extOptions } = useExtensionOptions()
  const { configs } = useProviderConfig()
  const { addEntry } = useSearchHistory()

  const enabledProviders = useMemo(
    () => configs.filter((c) => c.enabled),
    [configs]
  )

  const [committedSearchTerm, setCommittedSearchTerm] = useState(searchTerm)
  const [providerIdOverride, setProviderIdOverride] = useState<string>()
  const [parseSubmitToken, setParseSubmitToken] = useState(0)
  const [committedParseUrl, setCommittedParseUrl] = useState('')

  const isUrl = isParseableUrl(searchTerm)

  const activeProviderId =
    enabledProviders.find((p) => p.id === providerIdOverride)?.id ??
    enabledProviders[0]?.id

  const unknownErrorMessage = t('error.unknown', 'Something went wrong.')

  const providerQueries = useQueries({
    queries: enabledProviders.map((provider) => ({
      queryKey: seasonQueryKeys.search({
        keyword: committedSearchTerm,
        providerConfigId: provider.id,
      }),
      queryFn: () =>
        searchSeasonForProvider(
          provider.id,
          committedSearchTerm,
          unknownErrorMessage
        ),
      enabled:
        !!committedSearchTerm && !isUrl && provider.id === activeProviderId,
      staleTime: Number.POSITIVE_INFINITY,
      retry: false,
    })),
  })

  const queryByProvider = useMemo(() => {
    const map: Record<string, (typeof providerQueries)[number]> = {}
    enabledProviders.forEach((provider, index) => {
      map[provider.id] = providerQueries[index]
    })
    return map
  }, [providerQueries, enabledProviders])

  const chipStates = useMemo(() => {
    const out: Record<string, { isPending: boolean; count?: number }> = {}
    for (const provider of enabledProviders) {
      const query = queryByProvider[provider.id]
      const isPending = !!query?.isFetching
      const count = query?.data?.success ? query.data.data.length : undefined
      out[provider.id] = { isPending, count }
    }
    return out
  }, [enabledProviders, queryByProvider])

  const activeQuery = activeProviderId
    ? queryByProvider[activeProviderId]
    : undefined
  const activeProvider = enabledProviders.find((p) => p.id === activeProviderId)

  const handleSearchSubmit = (keyword?: string) => {
    const raw = keyword ?? searchTerm
    const trimmed = raw.trim()
    const processed = extOptions.searchUsingSimplified
      ? toSimplified(trimmed)
      : trimmed

    if (!processed) {
      return
    }

    onSearchTermChange(processed)
    setCommittedSearchTerm(processed)
    addEntry.mutate(trimmed)
    getTrackingService().track('search', { keyword: processed })
  }

  const handleParseSubmit = (url?: string) => {
    const trimmed = (url ?? searchTerm).trim()
    if (!trimmed) {
      return
    }
    setCommittedParseUrl(trimmed)
    setParseSubmitToken((token) => token + 1)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isUrl) {
      handleParseSubmit()
    } else {
      handleSearchSubmit()
    }
  }

  const handleInputSubmit = (value: string) => {
    if (isParseableUrl(value)) {
      handleParseSubmit(value)
    } else {
      handleSearchSubmit(value)
    }
  }

  const activeCount =
    activeQuery?.data?.success === true
      ? activeQuery.data.data.length
      : undefined

  const renderBody = (): ReactNode => {
    if (isUrl) {
      return (
        <UrlParseSection
          url={committedParseUrl}
          submitToken={parseSubmitToken}
          onImportSuccess={onImportSuccess}
        />
      )
    }
    if (committedSearchTerm && enabledProviders.length === 0) {
      return (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          data-testid="search-no-providers"
        >
          <NothingHere
            message={t(
              'searchPage.error.noProviders',
              'No danmaku sources enabled, please enable in settings'
            )}
            size={160}
          />
        </Box>
      )
    }
    if (committedSearchTerm && activeProvider && activeQuery) {
      return (
        <SeasonResultsList
          isLoading={activeQuery.isPending}
          data={activeQuery.data?.success ? activeQuery.data.data : null}
          error={
            activeQuery.data?.success === false
              ? activeQuery.data.error
              : undefined
          }
          onRetry={() => {
            void activeQuery.refetch()
          }}
          onSeasonClick={(season) => onSeasonClick(season, activeProvider)}
        />
      )
    }
    return <SearchMascot />
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <Stack
        spacing={1}
        sx={{
          px: 1.25,
          pt: 1,
          pb: 0.75,
          flexShrink: 0,
        }}
      >
        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            alignItems: 'stretch',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <SearchInput
              value={searchTerm}
              onChange={onSearchTermChange}
              onSubmit={handleInputSubmit}
              urlMode={isUrl}
              focusToken={focusToken}
            />
          </Box>
          {isUrl ? (
            <Button
              type="submit"
              variant="contained"
              disabled={!searchTerm.trim()}
              startIcon={<Download sx={{ fontSize: 14 }} />}
              data-testid="parse-submit"
              sx={{ flexShrink: 0, minHeight: 32, alignSelf: 'stretch' }}
            >
              {t('searchPage.parse.parse', 'Parse')}
            </Button>
          ) : (
            <Button
              type="submit"
              variant="contained"
              disabled={!searchTerm.trim()}
              startIcon={<Search sx={{ fontSize: 14 }} />}
              data-testid="search-submit"
              sx={{ flexShrink: 0, minHeight: 32, alignSelf: 'stretch' }}
            >
              {t('searchPage.search', 'Search')}
            </Button>
          )}
        </Stack>

        {!isUrl && committedSearchTerm && enabledProviders.length > 1 && (
          <SourceFilterChips
            providers={enabledProviders}
            states={chipStates}
            activeId={activeProviderId ?? enabledProviders[0]?.id ?? ''}
            onChange={setProviderIdOverride}
          />
        )}

        {!isUrl && committedSearchTerm && (
          <Typography
            variant="overline"
            sx={{
              color: 'text.secondary',
              minHeight: 16,
              lineHeight: '16px',
            }}
          >
            {typeof activeCount === 'number'
              ? t('searchPage.resultsCount', '{{count}} results', {
                  count: activeCount,
                })
              : ' '}
          </Typography>
        )}
      </Stack>
      <ScrollBox
        sx={{
          flex: 1,
          minHeight: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          px: 1.25,
          pb: 1.5,
        }}
      >
        {renderBody()}
      </ScrollBox>
    </Box>
  )
}
