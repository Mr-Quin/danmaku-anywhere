import type { DanDanSearchEpisodesAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'
import type { ListProps } from '@mui/material'
import { Button, ListItem, ListItemText } from '@mui/material'
import { useTranslation } from 'react-i18next'

import type { MediaSearchParams, MediaSearchResult } from '@/common/anime/dto'
import { useMediaSearchSuspense } from '@/common/anime/queries/useMediaSearchSuspense'
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
  searchParams: DanDanSearchEpisodesAPIParams
  provider: RemoteDanmakuSourceType
}

const methodMap: Record<
  RemoteDanmakuSourceType,
  (params: MediaSearchParams) => Promise<{ data: MediaSearchResult }>
> = {
  [DanmakuSourceType.DanDanPlay]: chromeRpcClient.searchDanDanPlay,
  [DanmakuSourceType.Bilibili]: chromeRpcClient.searchBilibili,
  [DanmakuSourceType.Tencent]: chromeRpcClient.searchTencent,
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
    if (result.data.data.length === 0) {
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
