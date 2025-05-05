import { useSeasonSearchSuspense } from '@/common/anime/queries/useSeasonSearchSuspense'
import {
  SeasonGrid,
  SeasonGridSkeleton,
} from '@/common/components/MediaList/components/SeasonGrid'
import type { HandleSeasonClick } from '@/common/components/MediaList/types'
import type { RemoteDanmakuSourceType } from '@/common/danmaku/enums'
import type { SearchEpisodesQuery } from '@danmaku-anywhere/danmaku-provider/ddp'
import { Box, Button, ListItem, ListItemText } from '@mui/material'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'

interface SeasonSearchResultProps {
  searchParams: SearchEpisodesQuery
  provider: RemoteDanmakuSourceType
  onSeasonClick: HandleSeasonClick
  stale: boolean
}

export const SeasonSearchResult = (props: SeasonSearchResultProps) => {
  return (
    <Box
      p={2}
      sx={{
        opacity: props.stale ? 0.5 : 1,
      }}
    >
      <Suspense key={props.provider} fallback={<SeasonGridSkeleton />}>
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
    provider,
    searchParams.anime
  )

  if (!result.success) {
    return (
      <ListItem>
        <ListItemText primary={result.error} />
        <Button onClick={() => refetch()} variant="text">
          {t('searchPage.retrySearch')}
        </Button>
      </ListItem>
    )
  }
  if (result.data.length === 0) {
    return (
      <ListItem>
        <ListItemText primary={t('searchPage.error.noResultFound')} />
      </ListItem>
    )
  }
  return <SeasonGrid onSeasonClick={onSeasonClick} data={result.data} />
}
