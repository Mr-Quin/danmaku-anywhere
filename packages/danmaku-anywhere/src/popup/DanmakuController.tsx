import { DanDanComment } from '@danmaku-anywhere/danmaku-engine'
import {
  Autocomplete,
  Box,
  Button,
  createFilterOptions,
  Stack,
  TextField,
} from '@mui/material'
import { useMemo } from 'react'
import { DanmakuMeta, useDanmakuDb } from '@/common/hooks/danmaku/useDanmakuDb'
import { useMessageSender } from '@/common/hooks/useMessages'
import { useSessionState } from '@/common/hooks/useSessionState'

export interface DanmakuStartMessage {
  action: 'danmaku/start'
  payload: {
    mediaQuery: string
    containerQuery: string
    comments: DanDanComment[]
  }
}

// interface ControllerState {

//   mediaQuery: string
//   containerQuery: string
//   episodeId: number
// }
//
// interface ControllerStore {
//   [key: string | number]: ControllerState
// }

// const useControllerStore = () => {
//   const { data, setData } = useExtStorage<ControllerStore>('control')
//
//   const setControllerState = (episodeId: number, state: ControllerState) => {
//     setStore((prev) => ({
//       ...prev,
//       [episodeId]: state,
//     }))
//   }
//
//   return {
//     store,
//     setControllerState,
//   }
// }

export const DanmakuController = () => {
  const { allDanmaku, isLoading, selectDanmaku } = useDanmakuDb()

  const options = useMemo(
    () =>
      allDanmaku.map((danmaku) => {
        return danmaku.meta
      }),
    [allDanmaku]
  )

  const [mediaQuery, setMediaQuery] = useSessionState('', 'mediaQuery')
  const [containerQuery, setContainerQuery] = useSessionState(
    '',
    'containerQuery'
  )
  const [episodeId, setEpisodeId] = useSessionState<DanmakuMeta | null>(
    options[0] ?? null,
    'controller/episodeId'
  )

  const comments = episodeId ? selectDanmaku(episodeId.episodeId)?.comments : []

  const { sendMessage } = useMessageSender(
    {
      action: 'danmaku/start',
      payload: {
        containerQuery,
        mediaQuery,
        comments: comments ?? [],
      },
    },
    {
      skip: true,
      tabQuery: { active: true, currentWindow: true },
    }
  )

  const { sendMessage: sendStop } = useMessageSender(
    {
      action: 'danmaku/stop',
    },
    {
      skip: true,
      tabQuery: { active: true, currentWindow: true },
    }
  )

  const filterOptions = createFilterOptions({
    stringify: (option: DanmakuMeta) =>
      `${option.animeTitle} ${option.episodeTitle}`,
  })

  return (
    <Box
      p={2}
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        sendMessage()
      }}
    >
      <Stack direction="column" spacing={2}>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Media Query"
            value={mediaQuery}
            onChange={(e) => setMediaQuery(e.target.value)}
            variant="standard"
            size="small"
          />
          <TextField
            label="Container Query"
            value={containerQuery}
            onChange={(e) => setContainerQuery(e.target.value)}
            variant="standard"
            size="small"
          />
        </Stack>
        <Autocomplete
          value={episodeId ?? null}
          loading={isLoading}
          options={options}
          filterOptions={filterOptions}
          onChange={(e, value) => {
            setEpisodeId(value)
          }}
          getOptionLabel={(option) => option.episodeTitle}
          groupBy={(option) => option.animeTitle}
          renderInput={(params) => {
            return <TextField {...params} label="Episode" />
          }}
          disablePortal
        />
        <Button type="submit" variant="outlined" size="small">
          Set
        </Button>
        <Button variant="outlined" size="small" onClick={sendStop}>
          Stop
        </Button>
      </Stack>
    </Box>
  )
}
