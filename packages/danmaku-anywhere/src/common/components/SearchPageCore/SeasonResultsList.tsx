import type {
  CustomSeason,
  Season,
  SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { Box, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { NothingHere } from '@/common/components/NothingHere'
import { seasonSourceKey } from '@/common/danmaku/seasonLabel'
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

function CenterFill({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </Box>
  )
}

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
      <CenterFill>
        <ErrorMessage
          message={error}
          size={160}
          beforeContent={
            <Button onClick={onRetry} variant="text" data-testid="search-retry">
              {t('searchPage.retrySearch', 'Retry')}
            </Button>
          }
        />
      </CenterFill>
    )
  }

  if (!data || data.length === 0) {
    return (
      <CenterFill>
        <NothingHere
          message={t(
            'searchPage.error.noResultFound',
            'No results found, try a different search term'
          )}
          size={160}
        />
      </CenterFill>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      {data.map((season) => (
        <SeasonResultRow
          key={`${seasonSourceKey(season)}-${'id' in season ? season.id : season.indexedId}`}
          season={season}
          onClick={onSeasonClick}
        />
      ))}
    </Box>
  )
}
