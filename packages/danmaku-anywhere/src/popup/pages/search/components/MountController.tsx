import { Update } from '@mui/icons-material'
import {
  Box,
  Button,
  CircularProgress,
  createFilterOptions,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { Suspense, type HTMLAttributes, type SyntheticEvent } from 'react'

import { MountControllerAutoComplete } from './MountControllerAutoComplete'

import type { DanmakuCache } from '@/common/db/db'
import { useSessionState } from '@/common/hooks/extStorage/useSessionState'
import { danmakuControlMessage } from '@/common/messages/danmakuControlMessage'
import { episodeIdToEpisodeNumber } from '@/common/utils'
import { useFetchDanmakuMutation } from '@/popup/hooks/useFetchDanmakuMutation'

export const filterOptions = createFilterOptions({
  stringify: (option: DanmakuCache) =>
    `${option.meta.animeTitle} ${option.meta.episodeTitle}`,
})

export const isOptionEqualToValue = (
  option: DanmakuCache,
  value: DanmakuCache
) => {
  return option.meta.episodeId === value?.meta.episodeId
}

export const EpisodeOption = (
  props: {
    option: DanmakuCache
    isLoading: boolean
  } & HTMLAttributes<HTMLLIElement>
) => {
  const { option, isLoading, ...rest } = props
  const { isPending, fetch } = useFetchDanmakuMutation()

  const handleClick = (e: SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()

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
      {...rest}
      sx={{
        justifyContent: 'space-between !important' as 'space-between',
      }}
    >
      <Box>
        <Typography variant="body1">
          {option.meta.episodeTitle ??
            `Episode ${episodeIdToEpisodeNumber(option.meta.episodeId)}`}
        </Typography>

        <Typography variant="caption">
          {isLoading ? <Skeleton variant="text" width={48} /> : option.count}
        </Typography>
      </Box>
      <IconButton edge="end" disabled={isPending} onClick={handleClick}>
        <Tooltip title="Update" placement="top">
          <Update />
        </Tooltip>
        {isPending && (
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
  const [danmakuCache, setDanmakuCache] = useSessionState<DanmakuCache | null>(
    null,
    'controller/danmakuMeta'
  )

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
        <Suspense fallback={<Skeleton height={56} width="100%" />}>
          <MountControllerAutoComplete
            value={danmakuCache ?? null}
            onChange={setDanmakuCache}
          />
        </Suspense>
        <Button
          type="submit"
          variant="outlined"
          size="small"
          disabled={danmakuCache === null}
        >
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
