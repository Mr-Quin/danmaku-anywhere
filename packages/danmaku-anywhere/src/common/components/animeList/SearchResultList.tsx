import { DanDanAnime, DanDanEpisode } from '@danmaku-anywhere/danmaku-engine'
import {
  List,
  ListItem,
  ListItemText,
  ListProps,
  ListSubheader,
} from '@mui/material'
import React, { useId } from 'react'

import { AnimeTypeIcon } from './AnimeTypeIcon'

import { CollapsableListItems } from '@/common/components/animeList/CollapsableListItems'

interface SearchResultListProps {
  results: DanDanAnime[]
  renderEpisodes: (
    episode: DanDanEpisode[],
    result: DanDanAnime
  ) => React.ReactNode
  listProps?: ListProps
  dense?: boolean
}

export const SearchResultList = ({
  results,
  renderEpisodes,
  dense = false,
  listProps,
}: SearchResultListProps) => {
  const headerId = useId()

  return (
    <List
      aria-labelledby={headerId}
      subheader={
        <ListSubheader component="div" id={headerId}>
          Search Results
        </ListSubheader>
      }
      dense={dense}
      disablePadding
      {...listProps}
    >
      {results.length === 0 && (
        <ListItem>
          <ListItemText primary="No results found, try a different title" />
        </ListItem>
      )}
      {results.map((result) => {
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
                  type={result.type}
                  typeDescription={result.typeDescription}
                />
                <ListItemText primary={result.animeTitle} />
              </>
            }
            key={result.animeId}
          >
            <List dense={dense} disablePadding>
              {renderEpisodes(result.episodes, result)}
            </List>
          </CollapsableListItems>
        )
      })}
    </List>
  )
}
