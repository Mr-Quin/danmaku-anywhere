import { Check, Download, Update } from '@mui/icons-material'
import {
  CircularProgress,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DanmakuCache, DanmakuMeta, db } from '@/common/db'
import { popupLogger } from '@/common/logger'

const useFetchDanmakuMessage = (meta: DanmakuMeta) => {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<DanmakuCache>()
  const [error, setError] = useState<string>()

  const dispatchFetch = async () => {
    setIsLoading(true)
    setData(undefined)

    popupLogger.debug('useFetchDanmakuMessage', 'dispatchFetch', meta)

    try {
      const res = await chrome.runtime.sendMessage({
        action: 'danmaku/fetch',
        payload: {
          data: meta,
          options: {
            forceUpdate: true,
          },
        },
      })

      if (res.type === 'error') {
        throw new Error(res.payload)
      }

      setData(res.payload)

      return res
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    fetch: dispatchFetch,
    data,
    error,
    isLoading,
  }
}

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
  const {
    fetch,
    data: fetchedData,
    isLoading,
  } = useFetchDanmakuMessage({
    animeId,
    animeTitle,
    episodeId,
    episodeTitle,
  })

  const existingData = useLiveQuery(
    () => db.dandanplay.get(episodeId),
    [episodeId]
  )

  const data = existingData ?? fetchedData

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
