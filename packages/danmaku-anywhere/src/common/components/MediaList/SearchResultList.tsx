import type { SearchEpisodesQuery } from '@danmaku-anywhere/danmaku-provider/ddp'
import type { ListProps } from '@mui/material'
import {
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import { SeasonV1 } from '@/common/anime/types/v1/schema'
import { ProviderSearchList } from '@/common/components/MediaList/components/ProviderSearchList'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import type { RemoteDanmakuSourceType } from '@/common/danmaku/enums'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'

interface SearchResultListProps {
  renderEpisode: RenderEpisode
  listProps?: ListProps
  dense?: boolean
  searchParams: SearchEpisodesQuery
  pending?: boolean
  onLoad?: <T extends RemoteDanmakuSourceType>(
    provider: T,
    data: SeasonV1[]
  ) => void
  providers: RemoteDanmakuSourceType[]
}

export const SearchResultList = ({
  renderEpisode,
  dense = false,
  searchParams,
  listProps,
  providers,
  pending,
}: SearchResultListProps) => {
  const { t } = useTranslation()

  return providers.map((provider) => {
    return (
      <Suspense
        key={provider}
        fallback={
          <List
            dense
            disablePadding
            sx={{
              opacity: 0.5,
            }}
          >
            <ListItemButton disableRipple>
              <ListItemText primary={t(localizedDanmakuSourceType(provider))} />
              <CircularProgress size={24} />
            </ListItemButton>
          </List>
        }
      >
        <div
          style={{
            opacity: pending ? 0.5 : 1,
          }}
        >
          <ProviderSearchList
            renderEpisode={renderEpisode}
            dense={dense}
            searchParams={searchParams}
            provider={provider}
            listProps={listProps}
            key={provider}
          />
        </div>
      </Suspense>
    )
  })
}
