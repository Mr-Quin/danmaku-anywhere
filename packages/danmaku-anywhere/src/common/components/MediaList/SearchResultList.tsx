import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'
import type { ListProps } from '@mui/material'
import { ListItem, ListItemText } from '@mui/material'
import type React from 'react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CollapsibleList } from '@/common/components/MediaList/components/CollapsibleList'
import { SeasonsList } from '@/common/components/MediaList/SeasonsList'
import { useMediaSearchSuspense } from '@/common/anime/queries/useMediaSearchSuspense'
import { DanmakuProviderType } from '@/common/anime/enums'
import { MediaSearchResult } from '@/common/anime/dto'
import { RenderEpisode } from '@/common/components/MediaList/types'

interface SearchResultListProps {
  renderEpisode: RenderEpisode
  listProps?: ListProps
  dense?: boolean
  searchParams: DanDanAnimeSearchAPIParams
  pending?: boolean
  onLoad?: (animes: MediaSearchResult[]) => void
}

export const SearchResultList = ({
  renderEpisode,
  dense = false,
  pending,
  onLoad,
  searchParams,
  listProps,
}: SearchResultListProps) => {
  const { t } = useTranslation()
  const { data, error } = useMediaSearchSuspense({
    params: {
      keyword: searchParams.anime,
    },
    providers: [DanmakuProviderType.DanDanPlay, DanmakuProviderType.Bilibili],
  })

  useEffect(() => {
    onLoad?.(data)
  }, [data])

  return data.map((result) => {
    return (
      <CollapsibleList
        listProps={{
          dense,
          disablePadding: true,
          sx: {
            opacity: pending ? 0.5 : 1,
          },
          ...listProps,
        }}
        listItemChildren={
          <>
            <ListItemText primary={t(DanmakuProviderType[result.provider])} />
          </>
        }
        key={result.provider}
      >
        {error && (
          <ListItem>
            <ListItemText primary="An error occurred while searching" />
          </ListItem>
        )}
        {data.length === 0 && (
          <ListItem>
            <ListItemText primary="No results found, try a different title" />
          </ListItem>
        )}
        <SeasonsList
          data={result}
          renderEpisode={renderEpisode}
          dense={dense}
        />
      </CollapsibleList>
    )
  })
}
