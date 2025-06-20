import type { SearchEpisodesQuery } from '@danmaku-anywhere/danmaku-provider/ddp'
import { Box, Button, ListItem, ListItemText } from '@mui/material'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useSeasonSearchSuspense } from '@/common/anime/queries/useSeasonSearchSuspense'
import {
  SeasonGrid,
  SeasonGridSkeleton,
} from '@/common/components/MediaList/components/SeasonGrid'
import type { HandleSeasonClick } from '@/common/components/MediaList/types'
import { NothingHere } from '@/common/components/NothingHere'
import type { RemoteDanmakuSourceType } from '@/common/danmaku/enums'

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
      flexGrow={1}
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
    return <NothingHere message={t('searchPage.error.noResultFound')} />
  }
  return (
    <SeasonGrid onSeasonClick={onSeasonClick} data={result.data} disableMenu />
  )
}
