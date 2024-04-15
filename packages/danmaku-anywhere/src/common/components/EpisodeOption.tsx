import { Update } from '@mui/icons-material'
import {
  Box,
  CircularProgress,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { type HTMLAttributes, type SyntheticEvent } from 'react'

import type { DanmakuCacheLite } from '@/common/db/db'
import { useFetchDanmaku } from '@/common/queries/danmaku/useFetchDanmaku'
import { episodeIdToEpisodeNumber } from '@/common/utils/utils'

export const EpisodeOption = (
  props: {
    option: DanmakuCacheLite
    isLoading: boolean
  } & HTMLAttributes<HTMLLIElement>
) => {
  const { option, isLoading, ...rest } = props
  const { isPending, fetch } = useFetchDanmaku()

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
