import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'
import type { ListProps } from '@mui/material'
import { ListItem, ListItemText } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useMediaSearchSuspense } from '@/common/anime/queries/useMediaSearchSuspense'
import { CollapsibleList } from '@/common/components/MediaList/components/CollapsibleList'
import { SeasonsList } from '@/common/components/MediaList/components/SeasonsList'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import type { DanmakuSourceType } from '@/common/danmaku/enums'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'

interface ProviderSearchListProps {
  renderEpisode: RenderEpisode
  listProps?: ListProps
  dense?: boolean
  searchParams: DanDanAnimeSearchAPIParams
  provider: DanmakuSourceType
}

export const ProviderSearchList = ({
  dense = false,
  searchParams,
  provider,
  listProps,
  renderEpisode,
}: ProviderSearchListProps) => {
  const { t } = useTranslation()

  const { data: result, isPending } = useMediaSearchSuspense({
    params: {
      keyword: searchParams.anime,
    },
    provider,
  })

  const renderSeasons = () => {
    if (!result.success) {
      return (
        <ListItem>
          <ListItemText primary={result.error} />
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
      {renderSeasons()}
    </CollapsibleList>
  )
}
