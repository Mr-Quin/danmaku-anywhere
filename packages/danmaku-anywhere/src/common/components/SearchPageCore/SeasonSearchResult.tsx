import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import type { SearchEpisodesQuery } from '@danmaku-anywhere/danmaku-provider/ddp'
import { Box, Button } from '@mui/material'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useSeasonSearchSuspense } from '@/common/anime/queries/useSeasonSearchSuspense'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { NothingHere } from '@/common/components/NothingHere'
import {
  SeasonGrid,
  SeasonGridSkeleton,
} from '@/common/components/Season/SeasonGrid'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'

interface SeasonSearchResultProps {
  searchParams: SearchEpisodesQuery
  provider: ProviderConfig
  onSeasonClick: (
    season: Season | CustomSeason,
    provider: ProviderConfig
  ) => void
  stale: boolean
}

export const SeasonSearchResult = (props: SeasonSearchResultProps) => {
  return (
    <Box
      p={2}
      sx={{
        opacity: props.stale ? 0.5 : 1,
      }}
      flexGrow={1}
    >
      <Suspense key={props.provider.id} fallback={<SeasonGridSkeleton />}>
        <SeasonSearchResultSuspense {...props} />
      </Suspense>
    </Box>
  )
}

const SeasonSearchResultSuspense = ({
  searchParams,
  provider,
  onSeasonClick,
}: SeasonSearchResultProps) => {
  const { t } = useTranslation()

  const { data: result, refetch } = useSeasonSearchSuspense(
    provider.id,
    searchParams.anime
  )

  if (!result.success) {
    return (
      <div>
        <ErrorMessage
          message={result.error}
          size={200}
          beforeContent={
            <Button onClick={() => refetch()} variant="text">
              {t('searchPage.retrySearch', 'Retry')}
            </Button>
          }
        />
      </div>
    )
  }
  if (result.data.length === 0) {
    return (
      <NothingHere
        message={t(
          'searchPage.error.noResultFound',
          'No results found, try a different search term'
        )}
        size={200}
      />
    )
  }
  return (
    <SeasonGrid
      onSeasonClick={(season) => onSeasonClick(season, provider)}
      data={result.data}
      disableMenu
    />
  )
}
