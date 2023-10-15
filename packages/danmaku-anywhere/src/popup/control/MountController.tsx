import {
  Autocomplete,
  Box,
  Button,
  createFilterOptions,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMessageSender } from '@/common/hooks/useMessages'
import { useSessionState } from '@/common/hooks/useSessionState'
import { DanmakuMeta, db } from '@/common/db'

const filterOptions = createFilterOptions({
  stringify: (option: DanmakuMeta) =>
    `${option.animeTitle} ${option.episodeTitle}`,
})

const isOptionEqualToValue = (option: DanmakuMeta, value: DanmakuMeta) => {
  return option.episodeId === value?.episodeId
}

export const MountController = () => {
  const allDanmaku = useLiveQuery(() => db.dandanplay.toArray(), [], [])

  const options = useMemo(
    () =>
      allDanmaku.map((danmaku) => {
        return danmaku.meta
      }),
    [allDanmaku]
  )

  const [danmakuMeta, setDanmakuMeta, loading] = useSessionState<
    DanmakuMeta | undefined
  >(options[0], 'controller/danmakuMeta')

  const danmaku = useLiveQuery(
    () => db.dandanplay.get(danmakuMeta?.episodeId ?? 0),
    [danmakuMeta?.episodeId]
  )

  const { sendMessage: sendStart } = useMessageSender(
    {
      action: 'danmaku/start',
      payload: {
        comments: danmaku?.comments ?? [],
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

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        sendStart()
      }}
    >
      <Stack direction="column" spacing={2}>
        <Typography variant="h6">Active config</Typography>
        <Autocomplete
          value={danmakuMeta ?? null} // value must be null when empty so that the component is "controlled"
          loading={loading}
          options={options}
          filterOptions={filterOptions}
          isOptionEqualToValue={isOptionEqualToValue}
          onChange={(e, value) => {
            if (value) setDanmakuMeta(value)
          }}
          getOptionLabel={(option) => option.episodeTitle}
          groupBy={(option) => option.animeTitle}
          renderInput={(params) => {
            return <TextField {...params} label="Episode" />
          }}
          disablePortal
        />
        <Button type="submit" variant="outlined" size="small">
          Mount
        </Button>
        <Button
          variant="outlined"
          type="button"
          size="small"
          onClick={sendStop}
          color="warning"
        >
          Unmount
        </Button>
      </Stack>
    </Box>
  )
}
