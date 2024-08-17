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

import { isDanmakuProvider } from '../../danmaku/utils'

import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanmakuLite } from '@/common/danmaku/models/danmaku'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'

export const EpisodeOption = (
  props: {
    option: DanmakuLite
    isLoading: boolean
  } & HTMLAttributes<HTMLLIElement>
) => {
  const { option, isLoading, ...rest } = props
  const { isPending, mutate: load } = useFetchDanmaku()

  const handleClick = (e: SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const fetchOption = {
      forceUpdate: true,
    }

    if (isDanmakuProvider(option, DanmakuSourceType.DDP))
      return load({
        meta: option.meta,
        options: fetchOption,
      })
    if (isDanmakuProvider(option, DanmakuSourceType.Bilibili))
      return load({
        meta: option.meta,
        options: fetchOption,
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
        <Typography variant="body1">{option.episodeTitle}</Typography>

        <Typography variant="caption">
          {isLoading ? (
            <Skeleton variant="text" width={48} />
          ) : (
            option.commentCount
          )}
        </Typography>
      </Box>

      {!isDanmakuProvider(option, DanmakuSourceType.Custom) && (
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
      )}
    </Stack>
  )
}
