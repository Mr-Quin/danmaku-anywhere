import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'
import type { ListProps } from '@mui/material'
import { ListItem, ListItemText } from '@mui/material'
import { useTranslation } from 'react-i18next'

import type { DanmakuProviderType } from '@/common/anime/enums'
import { useMediaSearchSuspense } from '@/common/anime/queries/useMediaSearchSuspense'
import { CollapsibleList } from '@/common/components/MediaList/components/CollapsibleList'
import { SeasonsList } from '@/common/components/MediaList/components/SeasonsList'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'

interface ProviderSearchListProps {
  renderEpisode: RenderEpisode
  listProps?: ListProps
  dense?: boolean
  searchParams: DanDanAnimeSearchAPIParams
  provider: DanmakuProviderType
}

export const ProviderSearchList = ({
  dense = false,
  searchParams,
  provider,
  listProps,
  renderEpisode,
}: ProviderSearchListProps) => {
  const { t } = useTranslation()

  const { data, error, isPending } = useMediaSearchSuspense({
    params: {
      keyword: searchParams.anime,
    },
    provider,
  })

  return (
    <CollapsibleList
      listProps={{
        dense,
        disablePadding: true,
        sx: {
          opacity: isPending ? 0.5 : 1,
        },
        ...listProps,
      }}
      listItemChildren={
        <>
          <ListItemText primary={t(localizedDanmakuSourceType(provider))} />
        </>
      }
    >
      {error && (
        <ListItem>
          <ListItemText primary="An error occurred while searching" />
        </ListItem>
      )}
      {data.data.length === 0 && (
        <ListItem>
          <ListItemText primary="No results found, try a different title" />
        </ListItem>
      )}
      <SeasonsList data={data} renderEpisode={renderEpisode} dense={dense} />
    </CollapsibleList>
  )
}
