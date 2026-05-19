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
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollBox } from '@/common/components/layout/ScrollBox'
import { Logger } from '@/common/Logger'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { useSearchHistory } from '@/common/options/searchHistory/useSearchHistory'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { toSimplified } from '@/common/utils/utils'
import { SearchInput } from './SearchInput'
import { SearchMascot } from './SearchMascot'
import { SeasonResultsList } from './SeasonResultsList'
import { SourceFilterChips } from './SourceFilterChips'
import { isParseableUrl, UrlParseSection } from './UrlParseSection'

type SeasonOrInsert = Season | SeasonInsert | CustomSeason

type ProviderQueryResult =
  | {
      success: true
      data: SeasonOrInsert[]
    }
  | {
      success: false
      error: string
    }

async function runSeasonSearch(
  providerConfigId: string,
  keyword: string,
  unknownErrorMessage: string
): Promise<ProviderQueryResult> {
  try {
    getTrackingService().track('searchSeason', { keyword, providerConfigId })
    const data = await chromeRpcClient.seasonSearch({
      keyword,
      providerConfigId,
    })
    return { success: true, data: data.data }
  } catch (error) {
    Logger.debug('useMediaSearchSuspense error', error)
    const message = error instanceof Error ? error.message : unknownErrorMessage
    return { success: false, error: message }
  }
}

interface SearchFormProps {
  searchTerm: string
  onSearchTermChange: (term: string) => void
  onSeasonClick: (season: SeasonOrInsert, provider: ProviderConfig) => void
  onImportSuccess?: (episode: WithSeason<Episode>) => void
  showHotkey?: boolean
  focusToken?: number
}

export function SearchForm({
  searchTerm,
  onSearchTermChange,
  onSeasonClick,
  onImportSuccess,
  showHotkey,
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
  const [activeProviderId, setActiveProviderId] = useState<string | undefined>(
    enabledProviders[0]?.id
  )
  const [parseSubmitToken, setParseSubmitToken] = useState(0)

  const isUrl = isParseableUrl(searchTerm)

  useEffect(() => {
    if (
      !activeProviderId ||
      !enabledProviders.some((p) => p.id === activeProviderId)
    ) {
      setActiveProviderId(enabledProviders[0]?.id)
    }
  }, [activeProviderId, enabledProviders])

  const unknownErrorMessage = t('error.unknown', 'Something went wrong.')

  const providerQueries = useQueries({
    queries: enabledProviders.map((provider) => ({
      queryKey: seasonQueryKeys.search({
        keyword: committedSearchTerm,
        providerConfigId: provider.id,
      }),
      queryFn: () =>
        runSeasonSearch(provider.id, committedSearchTerm, unknownErrorMessage),
      enabled: !!committedSearchTerm && !isUrl,
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

  const counts = useMemo(() => {
    const out: Record<string, number | undefined> = {}
    for (const provider of enabledProviders) {
      const query = queryByProvider[provider.id]
      if (query?.data?.success) {
        out[provider.id] = query.data.data.length
      }
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

  const handleParseSubmit = () => {
    if (!searchTerm.trim()) {
      return
    }
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
      handleParseSubmit()
    } else {
      handleSearchSubmit(value)
    }
  }

  const activeCount =
    activeQuery?.data?.success === true
      ? activeQuery.data.data.length
      : undefined

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
        <Stack direction="row" spacing={0.75} alignItems="stretch">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <SearchInput
              value={searchTerm}
              onChange={onSearchTermChange}
              onSubmit={handleInputSubmit}
              urlMode={isUrl}
              showHotkey={showHotkey}
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
            counts={counts}
            activeId={activeProviderId ?? enabledProviders[0]?.id ?? ''}
            onChange={setActiveProviderId}
          />
        )}

        {!isUrl && committedSearchTerm && (
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ minHeight: 16, lineHeight: '16px' }}
          >
            {typeof activeCount === 'number'
              ? t('searchPage.resultsCount', '{{count}} results', {
                  count: activeCount,
                })
              : ' '}
          </Typography>
        )}
      </Stack>

      <ScrollBox
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          px: 1.25,
          pb: 1.5,
        }}
      >
        {isUrl ? (
          <UrlParseSection
            url={searchTerm}
            submitToken={parseSubmitToken}
            onImportSuccess={onImportSuccess}
          />
        ) : committedSearchTerm && activeProvider && activeQuery ? (
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
        ) : (
          <SearchMascot />
        )}
      </ScrollBox>
    </Box>
  )
}
