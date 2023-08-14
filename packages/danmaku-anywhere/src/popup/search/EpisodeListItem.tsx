import { Check, Download, Update } from '@mui/icons-material'
import {
  CircularProgress,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material'
import { useFetchDanmaku } from '@/common/hooks/danmaku/useFetchDanmaku'

interface EpisodeListItemProps {
  episodeId: number
  episodeTitle: string
  animeId: number
  animeTitle: string
}

export const EpisodeListItem = ({
  episodeId,
  episodeTitle,
  animeId,
  animeTitle,
}: EpisodeListItemProps) => {
  const { fetch, data, isLoading } = useFetchDanmaku({
    meta: {
      animeId,
      animeTitle,
      episodeId,
      episodeTitle,
    },
  })

  return (
    <ListItem
      key={episodeId}
      secondaryAction={
        <IconButton edge="end" disabled={isLoading} onClick={() => fetch()}>
          <Tooltip title={data ? 'Update' : 'Download'} placement="top">
            {data ? <Update /> : <Download />}
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
      disablePadding
    >
      <ListItem
        sx={{
          pl: 4,
        }}
        dense
      >
        <ListItemIcon>{data ? <Check /> : null}</ListItemIcon>
        <Tooltip title={episodeTitle} enterDelay={500} placement="top">
          <ListItemText
            primary={episodeTitle}
            primaryTypographyProps={{
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
            secondary={
              data
                ? `${new Date(data.timeUpdated).toLocaleDateString()} - ${
                    data.count
                  } comments ${data.version}`
                : ''
            }
          />
        </Tooltip>
      </ListItem>
    </ListItem>
  )
}
