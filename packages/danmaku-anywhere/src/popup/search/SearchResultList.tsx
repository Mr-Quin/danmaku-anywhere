import { DanDanAnime } from '@danmaku-anywhere/danmaku-engine'
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Tooltip,
} from '@mui/material'
import { useId } from 'react'
import { makeAnimeIcon } from '../../common/components/makeIcon'
import { EpisodeListItem } from '@/popup/search/EpisodeListItem'
import { CollapsableListItems } from '@/popup/search/CollapsableListItems'

interface SearchResultListProps {
  results: DanDanAnime[]
}

export const SearchResultList = ({ results }: SearchResultListProps) => {
  const headerId = useId()

  return (
    <Box>
      <List
        aria-labelledby={headerId}
        subheader={
          <ListSubheader component="div" id={headerId}>
            Search Results
          </ListSubheader>
        }
        dense
        disablePadding
      >
        {results.length === 0 && (
          <ListItem>
            <ListItemText primary="No results found, try a different title" />
          </ListItem>
        )}
        {results.map((result) => {
          return (
            <CollapsableListItems
              listItemChildren={
                <>
                  <Tooltip
                    title={result.typeDescription}
                    disableFocusListener
                    disableTouchListener
                  >
                    <ListItemIcon>{makeAnimeIcon(result.type)}</ListItemIcon>
                  </Tooltip>
                  <ListItemText primary={result.animeTitle} />
                </>
              }
              key={result.animeId}
            >
              <List dense disablePadding>
                {result.episodes.map((episode) => {
                  return (
                    <EpisodeListItem
                      episodeId={episode.episodeId}
                      episodeTitle={episode.episodeTitle}
                      animeId={result.animeId}
                      animeTitle={result.animeTitle}
                      key={episode.episodeId}
                    />
                  )
                })}
              </List>
            </CollapsableListItems>
          )
        })}
      </List>
    </Box>
  )
}
