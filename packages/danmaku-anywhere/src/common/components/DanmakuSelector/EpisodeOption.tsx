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

import { isCustomDanmaku } from '../../danmaku/utils'

import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanmakuLite } from '@/common/danmaku/models/entity/db'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'

export const EpisodeOption = (
  props: {
    option: DanmakuLite
    isLoading: boolean
  } & HTMLAttributes<HTMLLIElement>
) => {
  const { option, isLoading, ...rest } = props
  const { isPending, fetch } = useFetchDanmaku()

  const handleClick = (e: SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isCustomDanmaku(option.meta)) return

    void fetch({
      meta: option.meta,
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
        <Typography variant="body1">{option.episodeTitle}</Typography>

        <Typography variant="caption">
          {isLoading ? (
            <Skeleton variant="text" width={48} />
          ) : (
            option.commentCount
          )}
        </Typography>
      </Box>
      {option.provider !== DanmakuSourceType.Custom && (
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
