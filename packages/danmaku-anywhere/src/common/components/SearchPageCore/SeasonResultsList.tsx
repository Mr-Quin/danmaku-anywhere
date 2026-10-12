import type {
  CustomSeason,
  Season,
  SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { Box, Button, Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { NothingHere } from '@/common/components/NothingHere'
import { seasonSourceKey } from '@/common/danmaku/seasonLabel'
import { SeasonResultRow, SeasonResultRowSkeleton } from './SeasonResultRow'

type SeasonOrInsert = Season | SeasonInsert | CustomSeason

export interface SignInPrompt {
  sourceName: string
  url?: string
}

interface SeasonResultsListProps {
  isLoading: boolean
  data: SeasonOrInsert[] | null
  error?: string
  signIn?: SignInPrompt
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
  signIn,
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
          action={
            <Button onClick={onRetry} variant="text" data-testid="search-retry">
              {t('searchPage.retrySearch', 'Retry')}
            </Button>
          }
        />
      </CenterFill>
    )
  }

  if (signIn && (!data || data.length === 0)) {
    const signInUrl =
      signIn.url && /^https?:\/\//i.test(signIn.url) ? signIn.url : undefined
    return (
      <CenterFill>
        <NothingHere
          message={t(
            'searchPage.signInRequired',
            '{{name}} needs you to sign in to search',
            { name: signIn.sourceName }
          )}
          size={160}
        >
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {signInUrl ? (
              <Button
                variant="contained"
                size="small"
                href={signInUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="search-sign-in"
              >
                {t('providers.attention.signIn', 'Sign in')}
              </Button>
            ) : null}
            <Button variant="text" size="small" onClick={onRetry}>
              {t('searchPage.retrySearch', 'Retry')}
            </Button>
          </Stack>
        </NothingHere>
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
