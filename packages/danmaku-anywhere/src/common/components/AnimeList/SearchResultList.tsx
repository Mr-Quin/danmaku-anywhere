import type {
  DanDanAnime,
  DanDanAnimeSearchAPIParams,
  DanDanEpisode,
} from '@danmaku-anywhere/dandanplay-api'
import type { ListProps } from '@mui/material'
import { List, ListItem, ListItemText, ListSubheader } from '@mui/material'
import type React from 'react'
import { useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'

import { AnimeTypeIcon } from './AnimeTypeIcon'

import { useAnimeSearchSuspense } from '@/common/anime/queries/useAnimeSearchSuspense'
import { CollapsableListItems } from '@/common/components/AnimeList/CollapsableListItems'

interface SearchResultListProps {
  renderEpisodes: (
    episode: DanDanEpisode[],
    result: DanDanAnime
  ) => React.ReactNode
  listProps?: ListProps
  dense?: boolean
  searchParams: DanDanAnimeSearchAPIParams
  pending?: boolean
  onLoad?: (animes: DanDanAnime[]) => void
}

export const SearchResultList = ({
  renderEpisodes,
  dense = false,
  pending,
  onLoad,
  searchParams,
  listProps,
}: SearchResultListProps) => {
  const { t } = useTranslation()
  const headerId = useId()

  const { data, error } = useAnimeSearchSuspense(searchParams)

  useEffect(() => {
    onLoad?.(data)
  }, [data])

  return (
    <List
      aria-labelledby={headerId}
      subheader={
        <ListSubheader component="div" id={headerId}>
          {t('common.searchResults')}
        </ListSubheader>
      }
      dense={dense}
      disablePadding
      sx={{
        opacity: pending ? 0.5 : 1,
      }}
      {...listProps}
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
      {data.map((anime) => {
        return (
          <CollapsableListItems
            paperProps={{
              sx: {
                top: 48,
                position: 'sticky',
                zIndex: 1,
              },
            }}
            listItemChildren={
              <>
                <AnimeTypeIcon
                  type={anime.type}
                  typeDescription={anime.typeDescription}
                />
                <ListItemText primary={anime.animeTitle} />
              </>
            }
            key={anime.animeId}
          >
            <List dense={dense} disablePadding>
              {renderEpisodes(anime.episodes, anime)}
            </List>
          </CollapsableListItems>
        )
      })}
    </List>
  )
}
