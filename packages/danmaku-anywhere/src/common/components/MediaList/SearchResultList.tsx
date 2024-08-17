import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'
import type { ListProps } from '@mui/material'

import type { MediaSearchResult } from '@/common/anime/dto'
import { ProviderSearchList } from '@/common/components/MediaList/components/ProviderSearchList'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import type { DanmakuSourceType } from '@/common/danmaku/enums'

interface SearchResultListProps {
  renderEpisode: RenderEpisode
  listProps?: ListProps
  dense?: boolean
  searchParams: DanDanAnimeSearchAPIParams
  pending?: boolean
  onLoad?: <T extends MediaSearchResult['provider']>(
    provider: T,
    data: Extract<MediaSearchResult, { provider: T }>['data']
  ) => void
  providers: DanmakuSourceType[]
}

export const SearchResultList = ({
  renderEpisode,
  dense = false,
  searchParams,
  listProps,
  providers,
}: SearchResultListProps) => {
  return providers.map((provider) => {
    return (
      <ProviderSearchList
        renderEpisode={renderEpisode}
        dense={dense}
        searchParams={searchParams}
        provider={provider}
        listProps={listProps}
        key={provider}
      />
    )
  })
}
