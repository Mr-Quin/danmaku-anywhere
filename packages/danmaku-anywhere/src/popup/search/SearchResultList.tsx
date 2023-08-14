import { DanDanAnime } from '@danmaku-anywhere/danmaku-engine'
import {
  Box,
  Icon,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Tooltip,
} from '@mui/material'
import { useId } from 'react'
import { EpisodeListItem } from '@/popup/search/EpisodeListItem'
import { CollapsableListItems } from '@/popup/search/CollapsableListItems'

const getIcon = (type: DanDanAnime['type']) => {
  switch (type) {
    case 'jpdrama':
      return '🎭'
    case 'tvseries':
      return '📺'
    case 'movie':
      return '🎬'
    case 'ova':
      return '📼'
    case 'web':
      return '🌐'
    case 'musicvideo':
      return '🎵'
    default:
      return '❓'
  }
}

const makeIcon = (type: DanDanAnime['type']) => {
  return (
    <Icon
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {getIcon(type)}
    </Icon>
  )
}

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
                    <ListItemIcon>{makeIcon(result.type)}</ListItemIcon>
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
