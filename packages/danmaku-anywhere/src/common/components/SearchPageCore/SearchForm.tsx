import type {
  CustomSeason,
  Episode,
  Season,
  SeasonInsert,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Download, Search } from '@mui/icons-material'
import { Box, Button, Skeleton, Stack, Typography } from '@mui/material'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type ProviderSeasonResult,
  searchSeasonForProvider,
} from '@/common/anime/queries/searchSeasonForProvider'
import { ScrollBox } from '@/common/components/layout/ScrollBox'
import { NothingHere } from '@/common/components/NothingHere'
import { describeError } from '@/common/errors/describeError'
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
import { useSignInPrompt } from './useSignInPrompt'

type SeasonOrInsert = Season | SeasonInsert | CustomSeason

// A source that failed or came back empty is worth asking again when the user
// presses Search on the same keyword; a source with results is not.
function shouldRefetchOnResubmit(result: unknown): boolean {
  const data = result as ProviderSeasonResult | undefined
  if (!data) {
    return false
  }
  return !data.success || data.data.length === 0
}

interface SearchFormProps {
  searchTerm: string
  onSearchTermChange: (term: string) => void
  providerId?: string
  onProviderIdChange: (id: string) => void
  onSeasonClick: (season: SeasonOrInsert, provider: ProviderConfig) => void
  onImportSuccess?: (episode: WithSeason<Episode>) => void
  focusToken?: number
}

export function SearchForm({
  searchTerm,
  onSearchTermChange,
  providerId,
  onProviderIdChange,
  onSeasonClick,
  onImportSuccess,
  focusToken,
}: SearchFormProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: extOptions } = useExtensionOptions()
  const { configs } = useProviderConfig()
  const { addEntry } = useSearchHistory()

  const enabledProviders = useMemo(
    () => configs.filter((c) => c.enabled),
    [configs]
  )

  const [committedSearchTerm, setCommittedSearchTerm] = useState(searchTerm)
  const [parseSubmitToken, setParseSubmitToken] = useState(0)
  const [committedParseUrl, setCommittedParseUrl] = useState('')

  const isUrl = isParseableUrl(searchTerm)

  const activeProviderId =
    enabledProviders.find((p) => p.id === providerId)?.id ??
    enabledProviders[0]?.id

  const providerQueries = useQueries({
    queries: enabledProviders.map((provider) => ({
      queryKey: seasonQueryKeys.search({
        keyword: committedSearchTerm,
        providerConfigId: provider.id,
      }),
      queryFn: () => searchSeasonForProvider(provider.id, committedSearchTerm),
      enabled:
        !!committedSearchTerm && !isUrl && provider.id === activeProviderId,
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: 30 * 60 * 1000,
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

  const activeResultEmpty =
    activeQuery?.data?.success === true && activeQuery.data.data.length === 0
  const signIn = useSignInPrompt(activeProvider, activeResultEmpty)

  const handleSearchSubmit = (keyword?: string) => {
    const raw = keyword ?? searchTerm
    const trimmed = raw.trim()
    const processed = extOptions.searchUsingSimplified
      ? toSimplified(trimmed)
      : trimmed

    if (!processed) {
      return
    }

    if (processed === committedSearchTerm) {
      void queryClient.invalidateQueries({
        queryKey: seasonQueryKeys.search({ keyword: processed }),
        predicate: (query) => shouldRefetchOnResubmit(query.state.data),
      })
      if (signIn.needsSignIn) {
        signIn.recheck()
      }
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

  const renderResultCount = (): ReactNode => {
    if (activeQuery?.isFetching) {
      return (
        <Skeleton
          variant="text"
          width={56}
          data-testid="search-result-count-skeleton"
        />
      )
    }
    const result = activeQuery?.data
    if (result?.success) {
      return t('searchPage.resultsCount', '{{count}} results', {
        count: result.data.length,
      })
    }
    return ' '
  }

  const renderBody = (): ReactNode => {
    if (isUrl) {
      return (
        <UrlParseSection
          url={committedParseUrl}
          submitToken={parseSubmitToken}
          onImportSuccess={onImportSuccess}
          onSearchInstead={() => onSearchTermChange('')}
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
              'No danmaku sources enabled. Enable one on the Sources page.'
            )}
            size={160}
          />
        </Box>
      )
    }
    if (committedSearchTerm && activeProvider && activeQuery) {
      return (
        <SeasonResultsList
          isLoading={activeQuery.isFetching}
          data={activeQuery.data?.success ? activeQuery.data.data : null}
          error={
            activeQuery.data?.success === false
              ? describeError(activeQuery.data.error).message
              : undefined
          }
          signIn={
            signIn.needsSignIn
              ? { sourceName: activeProvider.name, url: signIn.signInUrl }
              : undefined
          }
          onRetry={() => {
            void activeQuery.refetch()
            if (signIn.needsSignIn) {
              signIn.recheck()
            }
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
          px: 2,
          pb: 0.5,
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
              hasCommittedSearch={!!committedSearchTerm}
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
            activeId={activeProviderId ?? ''}
            onChange={onProviderIdChange}
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
            {renderResultCount()}
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
