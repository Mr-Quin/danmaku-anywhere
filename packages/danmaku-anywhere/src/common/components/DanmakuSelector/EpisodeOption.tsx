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

import { isProvider } from '../../danmaku/utils'

import { DanmakuSourceType } from '@/common/danmaku/enums'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { EpisodeLiteV4, WithSeason } from '@/common/danmaku/types/v4/schema'

export const EpisodeOption = (
  props: {
    option: WithSeason<EpisodeLiteV4>
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

    if (isProvider(option, DanmakuSourceType.DanDanPlay))
      return load({
        meta: option,
        options: fetchOption,
      })
    if (isProvider(option, DanmakuSourceType.Bilibili))
      return load({
        meta: option,
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
        <Typography variant="body1">{option.title}</Typography>

        <Typography variant="caption">
          {isLoading ? (
            <Skeleton variant="text" width={48} />
          ) : (
            option.commentCount
          )}
        </Typography>
      </Box>

      {!isProvider(option, DanmakuSourceType.Custom) && (
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
