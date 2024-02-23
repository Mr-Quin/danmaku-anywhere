import {
  DanDanComment,
  parseDanDanCommentParams,
} from '@danmaku-anywhere/danmaku-engine'
import { Box, BoxProps, Stack } from '@mui/material'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

interface CommentListProps extends BoxProps {
  comments: DanDanComment[]
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds
  ).padStart(2, '0')}`
}

export const CommentList = ({ comments, ...rest }: CommentListProps) => {
  const ref = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: comments.length,
    getScrollElement: () => ref.current,
    estimateSize: () => 20,
  })

  return (
    <Box ref={ref} height="100%" overflow="auto" {...rest}>
      <Stack direction="row" spacing={2}>
        <div>time</div>
        <div>color</div>
        <div>comment</div>
      </Stack>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const comment = comments[virtualItem.index]
          const { time, color } = parseDanDanCommentParams(comment.p)

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <Stack direction="row" spacing={2}>
                <div>{formatTime(time)}</div>
                <div
                  style={{
                    color: `${color}`,
                  }}
                >
                  {color}
                </div>
                <div>{comments[virtualItem.index].m}</div>
              </Stack>
            </div>
          )
        })}
      </div>
    </Box>
  )
}
