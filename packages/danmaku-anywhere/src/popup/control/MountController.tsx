import { Update } from '@mui/icons-material'
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  createFilterOptions,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useLiveQuery } from 'dexie-react-hooks'
import { HTMLAttributes, SyntheticEvent } from 'react'

import { useFetchDanmaku } from '../hooks/useFetchDanmaku'

import { DanmakuCache, db } from '@/common/db'
import { useSessionState } from '@/common/hooks/useSessionState'
import { danmakuControlMessage } from '@/common/messages/danmakuControlMessage'

const filterOptions = createFilterOptions({
  stringify: (option: DanmakuCache) =>
    `${option.meta.animeTitle} ${option.meta.episodeTitle}`,
})

const isOptionEqualToValue = (option: DanmakuCache, value: DanmakuCache) => {
  return option.meta.episodeId === value?.meta.episodeId
}

const EpisodeOption = (
  props: { option: DanmakuCache } & HTMLAttributes<HTMLLIElement>
) => {
  const { option } = props
  const { isLoading, fetch } = useFetchDanmaku()

  const handleClick = (e: SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation() // prevent the Autocomplete from closing
    fetch({
      data: option.meta,
      options: {
        forceUpdate: true,
      },
    })
  }

  return (
    <Stack
      direction="row"
      component="li"
      {...props}
      sx={{
        justifyContent: 'space-between !important' as 'space-between',
      }}
    >
      <Box>
        <Typography variant="body1">{option.meta.episodeTitle}</Typography>
        <Typography variant="caption">{option.count}</Typography>
      </Box>
      <IconButton edge="end" disabled={isLoading} onClick={handleClick}>
        <Tooltip title="Update" placement="top">
          <Update />
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
    </Stack>
  )
}

export const MountController = () => {
  const options = useLiveQuery(() => db.dandanplay.toArray(), [], [])

  const [danmakuCache, setDanmakuCache, loading] = useSessionState<
    DanmakuCache | undefined
  >(options[0], 'controller/danmakuMeta')

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        danmakuControlMessage.set({
          comments: danmakuCache?.comments ?? [],
        })
      }}
    >
      <Stack direction="column" spacing={2}>
        <Typography variant="h6">Active config</Typography>
        <Autocomplete
          value={danmakuCache ?? null} // value must be null when empty so that the component is "controlled"
          loading={loading}
          options={options}
          filterOptions={filterOptions}
          isOptionEqualToValue={isOptionEqualToValue}
          onChange={(e, value) => {
            if (value) setDanmakuCache(value)
          }}
          renderOption={(props, option) => {
            return <EpisodeOption {...props} option={option} />
          }}
          getOptionLabel={(option) => option.meta.episodeTitle}
          groupBy={(option) => option.meta.animeTitle}
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
          onClick={danmakuControlMessage.unset}
          color="warning"
        >
          Unmount
        </Button>
      </Stack>
    </Box>
  )
}
