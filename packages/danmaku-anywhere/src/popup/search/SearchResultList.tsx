import { DanDanAnime, DanDanEpisode } from '@danmaku-anywhere/danmaku-engine'
import {
  Check,
  Download,
  ExpandLess,
  ExpandMore,
  Update,
} from '@mui/icons-material'
import {
  Box,
  CircularProgress,
  Collapse,
  Icon,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemButtonProps,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Paper,
  Tooltip,
} from '@mui/material'
import { ReactNode, useId, useState } from 'react'
import { DanmakuMeta, useDanmakuDb } from '@/common/hooks/danmaku/useDanmakuDb'

interface CollapsableListItemProps extends ListItemButtonProps {
  listItemChildren: ReactNode
}

const CollapsableListItems = ({
  listItemChildren,
  children,
  ...rest
}: CollapsableListItemProps) => {
  const [open, setOpen] = useState(false)

  const handleClick = () => {
    setOpen(!open)
  }

  return (
    <>
      <Paper
        sx={{
          top: 48,
          position: 'sticky',
          zIndex: 1,
          // bgcolor: 'background.paper',
        }}
      >
        <ListItemButton onClick={handleClick} disableRipple {...rest}>
          {listItemChildren}
          {open ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
      </Paper>
      <Collapse in={open} timeout="auto" unmountOnExit>
        {children}
      </Collapse>
    </>
  )
}

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

const makeIcon = (text: string) => {
  return (
    <Icon
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {text}
    </Icon>
  )
}

interface SearchResultListProps {
  results: DanDanAnime[]
  loading?: boolean
  selectedEpisodeId?: number
  onSelect: (selection: DanmakuMeta) => void
  onFetch?: (selection: DanmakuMeta) => void
}

export const SearchResultList = ({
  results,
  loading,
  selectedEpisodeId,
  onSelect,
  onFetch,
}: SearchResultListProps) => {
  const headerId = useId()
  const { selectDanmaku, deleteDanmaku } = useDanmakuDb()

  const createMeta = (anime: DanDanAnime, episode: DanDanEpisode) => {
    return {
      animeId: anime.animeId,
      animeTitle: anime.animeTitle,
      episodeId: episode.episodeId,
      episodeTitle: episode.episodeTitle,
    }
  }

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
            <ListItemText primary="No results found" />
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
                    <ListItemIcon>
                      {makeIcon(getIcon(result.type))}
                    </ListItemIcon>
                  </Tooltip>
                  <ListItemText primary={result.animeTitle} />
                </>
              }
              key={result.animeId}
            >
              <List dense disablePadding>
                {result.episodes.map((episode) => {
                  const currentDanmaku = selectDanmaku(episode.episodeId)
                  const danmakuExists = !!currentDanmaku
                  return (
                    <ListItem
                      key={episode.episodeId}
                      secondaryAction={
                        <Tooltip
                          title={danmakuExists ? 'Update' : 'Download'}
                          placement="top"
                        >
                          <IconButton
                            edge="end"
                            disabled={loading}
                            onClick={() =>
                              onFetch?.(createMeta(result, episode))
                            }
                          >
                            {danmakuExists ? <Update /> : <Download />}
                            {loading && (
                              <CircularProgress
                                sx={{
                                  position: 'absolute',
                                }}
                                size={24}
                              />
                            )}
                          </IconButton>
                        </Tooltip>
                      }
                      disablePadding
                    >
                      <ListItemButton
                        sx={{
                          pl: 4,
                        }}
                        onClick={() => {
                          onSelect(createMeta(result, episode))
                        }}
                        dense
                      >
                        <ListItemIcon>
                          {selectedEpisodeId === episode.episodeId ? (
                            <Check />
                          ) : null}
                        </ListItemIcon>
                        <Tooltip
                          title={episode.episodeTitle}
                          enterDelay={500}
                          placement="top"
                        >
                          <ListItemText
                            primary={episode.episodeTitle}
                            primaryTypographyProps={{
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                            }}
                            secondary={
                              danmakuExists
                                ? `${new Date(
                                    currentDanmaku!.timeUpdated
                                  ).toLocaleDateString()} - ${
                                    currentDanmaku!.count
                                  } comments`
                                : ''
                            }
                          />
                        </Tooltip>
                      </ListItemButton>
                    </ListItem>
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
