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
import { DanmakuMeta } from '@/common/hooks/danmaku/useDanmakuQuery'
import { useDanmakuQueryAll } from '@/common/hooks/danmaku/useDanmakuQueryAll'
import { useMessageSender } from '@/common/hooks/useMessages'
import { useSessionState } from '@/common/hooks/useSessionState'

const filterOptions = createFilterOptions({
  stringify: (option: DanmakuMeta) =>
    `${option.animeTitle} ${option.episodeTitle}`,
})

const isOptionEqualToValue = (option: DanmakuMeta, value: DanmakuMeta) => {
  return option.episodeId === value?.episodeId
}

export const MountController = () => {
  const { data, isLoading, select } = useDanmakuQueryAll()

  const options = useMemo(
    () =>
      data.map((danmaku) => {
        return danmaku.meta
      }),
    [data]
  )

  const [danmakuMeta, setDanmakuMeta, loading] = useSessionState<
    DanmakuMeta | undefined
  >(options[0], 'controller/danmakuMeta')

  const comments = danmakuMeta
    ? select(danmakuMeta.episodeId)?.comments
    : undefined

  const { sendMessage } = useMessageSender(
    {
      action: 'danmaku/start',
      payload: {
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

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        sendMessage()
      }}
    >
      <Stack direction="column" spacing={2}>
        <Typography variant="h6">Mount</Typography>
        <Autocomplete
          value={danmakuMeta ?? null} // value must be null when empty so that the component is "controlled"
          loading={isLoading || loading}
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
