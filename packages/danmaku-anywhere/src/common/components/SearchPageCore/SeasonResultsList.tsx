import type {
  CustomSeason,
  Season,
  SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { Box, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { NothingHere } from '@/common/components/NothingHere'
import { SeasonResultRow, SeasonResultRowSkeleton } from './SeasonResultRow'

type SeasonOrInsert = Season | SeasonInsert | CustomSeason

interface SeasonResultsListProps {
  isLoading: boolean
  data: SeasonOrInsert[] | null
  error?: string
  onRetry: () => void
  onSeasonClick: (season: SeasonOrInsert) => void
}

const SKELETON_ROWS = 4

export function SeasonResultsList({
  isLoading,
  data,
  error,
  onRetry,
  onSeasonClick,
}: SeasonResultsListProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <SeasonResultRowSkeleton key={`skeleton-${index}`} />
        ))}
      </Box>
    )
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
        size={200}
        beforeContent={
          <Button onClick={onRetry} variant="text">
            {t('searchPage.retrySearch', 'Retry')}
          </Button>
        }
      />
    )
  }

  if (!data || data.length === 0) {
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      {data.map((season) => (
        <SeasonResultRow
          key={`${season.provider}-${'id' in season ? season.id : season.indexedId}`}
          season={season}
          onClick={onSeasonClick}
        />
      ))}
    </Box>
  )
}
