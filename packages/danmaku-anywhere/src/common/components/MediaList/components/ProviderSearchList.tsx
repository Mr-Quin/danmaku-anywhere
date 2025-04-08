import type { SearchEpisodesQuery } from '@danmaku-anywhere/danmaku-provider/ddp'
import type { ListProps } from '@mui/material'
import { Button, ListItem, ListItemText } from '@mui/material'
import { useTranslation } from 'react-i18next'

import type { SeasonSearchParams } from '@/common/anime/dto'
import { useMediaSearchSuspense } from '@/common/anime/queries/useMediaSearchSuspense'
import { SeasonV1 } from '@/common/anime/types/v1/schema'
import { CollapsibleList } from '@/common/components/MediaList/components/CollapsibleList'
import { SeasonsList } from '@/common/components/MediaList/components/SeasonsList'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import type { RemoteDanmakuSourceType } from '@/common/danmaku/enums'
import {
  DanmakuSourceType,
  localizedDanmakuSourceType,
} from '@/common/danmaku/enums'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

interface ProviderSearchListProps {
  renderEpisode: RenderEpisode
  listProps?: ListProps
  dense?: boolean
  searchParams: SearchEpisodesQuery
  provider: RemoteDanmakuSourceType
}

const methodMap: Record<
  RemoteDanmakuSourceType,
  (params: SeasonSearchParams) => Promise<{ data: SeasonV1[] }>
> = {
  [DanmakuSourceType.DanDanPlay]: chromeRpcClient.seasonSearchDanDanPlay,
  [DanmakuSourceType.Bilibili]: chromeRpcClient.seasonSearchBilibili,
  [DanmakuSourceType.Tencent]: chromeRpcClient.seasonSearchTencent,
}

export const ProviderSearchList = ({
  dense = false,
  searchParams,
  provider,
  listProps,
  renderEpisode,
}: ProviderSearchListProps) => {
  const { t } = useTranslation()

  const { data: result, refetch } = useMediaSearchSuspense(
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
    return (
      <SeasonsList
        data={result.data}
        renderEpisode={renderEpisode}
        dense={dense}
      />
    )
  }

  return (
    <CollapsibleList
      listProps={{
        dense,
        disablePadding: true,
        ...listProps,
      }}
      listItemChildren={
        <>
          <ListItemText primary={t(localizedDanmakuSourceType(provider))} />
        </>
      }
    >
      {renderSeasons()}
    </CollapsibleList>
  )
}
