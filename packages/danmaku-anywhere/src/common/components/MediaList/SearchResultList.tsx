import type { SeasonSearchParams } from '@/common/anime/dto'
import { useSeasonSearchSuspense } from '@/common/anime/queries/useSeasonSearchSuspense'
import { SeasonV1 } from '@/common/anime/types/v1/schema'
import {
  SeasonGrid,
  SeasonGridSkeleton,
} from '@/common/components/MediaList/components/SeasonGrid'
import type { HandleSeasonClick } from '@/common/components/MediaList/types'
import {
  DanmakuSourceType,
  RemoteDanmakuSourceType,
} from '@/common/danmaku/enums'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import type { SearchEpisodesQuery } from '@danmaku-anywhere/danmaku-provider/ddp'
import { Box, Button, ListItem, ListItemText, Tab, Tabs } from '@mui/material'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'

interface ProviderSearchListProps {
  searchParams: SearchEpisodesQuery
  provider: RemoteDanmakuSourceType
  onSeasonClick: HandleSeasonClick
}

const methodMap: Record<
  RemoteDanmakuSourceType,
  (params: SeasonSearchParams) => Promise<{ data: SeasonV1[] }>
> = {
  [DanmakuSourceType.DanDanPlay]: chromeRpcClient.seasonSearchDanDanPlay,
  [DanmakuSourceType.Bilibili]: chromeRpcClient.seasonSearchBilibili,
  [DanmakuSourceType.Tencent]: chromeRpcClient.seasonSearchTencent,
}

const SeasonSearchResult = ({
  searchParams,
  provider,
  onSeasonClick,
}: ProviderSearchListProps) => {
  const { t } = useTranslation()

  const { data: result, refetch } = useSeasonSearchSuspense(
    provider,
    {
      keyword: searchParams.anime,
    },
    methodMap[provider]
  )

  const renderSeasons = () => {
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

  return renderSeasons()
}

interface SearchResultListProps {
  searchParams: SearchEpisodesQuery
  pending?: boolean
  providers: RemoteDanmakuSourceType[]
  onSeasonClick: HandleSeasonClick
  selectedTab: RemoteDanmakuSourceType
  onTabChange: (tab: RemoteDanmakuSourceType) => void
}

export const SearchResultList = ({
  searchParams,
  providers,
  pending,
  onSeasonClick,
  selectedTab,
  onTabChange,
}: SearchResultListProps) => {
  const { t } = useTranslation()

  return (
    <div>
      <Tabs
        value={selectedTab}
        onChange={(_, value) => onTabChange?.(value)}
        sx={{
          position: 'sticky',
          top: 0,
          backgroundColor: 'background.paper',
          zIndex: 1,
        }}
      >
        {providers.map((provider) => {
          return (
            <Tab
              value={provider}
              label={t(localizedDanmakuSourceType(provider))}
              key={provider}
            />
          )
        })}
      </Tabs>
      <Box
        p={2}
        sx={{
          opacity: pending ? 0.5 : 1,
        }}
      >
        <Suspense key={selectedTab} fallback={<SeasonGridSkeleton />}>
          <SeasonSearchResult
            searchParams={searchParams}
            provider={selectedTab}
            onSeasonClick={onSeasonClick}
          />
        </Suspense>
      </Box>
    </div>
  )
}
