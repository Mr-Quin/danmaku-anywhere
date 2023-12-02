import { Check, Download, Update } from '@mui/icons-material'
import {
  CircularProgress,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material'
import { useLiveQuery } from 'dexie-react-hooks'
import { useFetchDanmaku } from '../hooks/useFetchDanmaku'
import { db } from '@/common/db'

interface EpisodeListItemProps {
  episodeId: number
  episodeTitle: string
  animeId: number
  animeTitle: string
}

export const EpisodeListItem = (props: EpisodeListItemProps) => {
  const { episodeId, episodeTitle } = props
  const { fetch, isLoading } = useFetchDanmaku()

  const danmakuData = useLiveQuery(
    () => db.dandanplay.get(episodeId),
    [episodeId]
  )

  return (
    <ListItem
      key={episodeId}
      secondaryAction={
        <IconButton
          edge="end"
          disabled={isLoading}
          onClick={() => {
            fetch({
              data: props,
              options: {
                forceUpdate: true,
              },
            })
          }}
        >
          <Tooltip title={danmakuData ? 'Update' : 'Download'} placement="top">
            {danmakuData ? <Update /> : <Download />}
          </Tooltip>
          {isLoading && (
            <CircularProgress
              sx={{
                position: 'absolute',
              }}
              size={24}
            />
          )}
        </IconButton>
      }
      sx={{
        pl: 4,
      }}
    >
      <ListItemIcon>{danmakuData ? <Check /> : null}</ListItemIcon>
      <Tooltip title={episodeTitle} enterDelay={500} placement="top">
        <ListItemText
          primary={episodeTitle}
          primaryTypographyProps={{
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}
          secondary={
            danmakuData
              ? `${new Date(danmakuData.timeUpdated).toLocaleDateString()} - ${
                  danmakuData.count
                } comments ${danmakuData.version}`
              : ''
          }
        />
      </Tooltip>
    </ListItem>
  )
}
