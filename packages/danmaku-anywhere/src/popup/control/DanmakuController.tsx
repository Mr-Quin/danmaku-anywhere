import {
  Autocomplete,
  Box,
  Button,
  createFilterOptions,
  Stack,
  TextField,
} from '@mui/material'
import { useMemo } from 'react'
import { blankMountConfig } from '@/common/constants'
import { DanmakuMeta, useDanmakuDb } from '@/common/hooks/danmaku/useDanmakuDb'
import {
  useActiveTabUrl,
  useCurrentMountConfig,
  useMountConfig,
} from '@/common/hooks/mountConfig/useMountConfig'
import { useMessageSender } from '@/common/hooks/useMessages'
import { useSessionState } from '@/common/hooks/useSessionState'
import { MountConfigEditor } from '@/popup/control/MountConfigEditor'

export const DanmakuController = () => {
  const { allDanmaku, isLoading, selectDanmaku } = useDanmakuDb()

  const options = useMemo(
    () =>
      allDanmaku.map((danmaku) => {
        return danmaku.meta
      }),
    [allDanmaku]
  )

  const url = useActiveTabUrl()
  const { updateConfig, addConfig, deleteConfig, configs } = useMountConfig()
  const config = useCurrentMountConfig(url, configs)

  const [episodeId, setEpisodeId] = useSessionState<DanmakuMeta | null>(
    options[0] ?? null,
    'controller/episodeId'
  )

  const comments = episodeId ? selectDanmaku(episodeId.episodeId)?.comments : []

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
          Mount
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={sendStop}
          color="warning"
        >
          Unmount
        </Button>
        {/*<ConfigControl />*/}
        <MountConfigEditor
          config={config ?? blankMountConfig(url ?? '')}
          onUpdate={updateConfig}
          onAdd={addConfig}
          onDelete={deleteConfig}
        />
      </Stack>
    </Box>
  )
}
