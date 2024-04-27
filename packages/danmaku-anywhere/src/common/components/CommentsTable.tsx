import type { CachedComment } from '@danmaku-anywhere/danmaku-engine'
import { parseDanDanCommentParams } from '@danmaku-anywhere/danmaku-engine'
import type { BoxProps } from '@mui/material'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
} from '@mui/material'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { match } from 'ts-pattern'

interface CommentListProps extends BoxProps {
  comments: CachedComment[]
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds
  ).padStart(2, '0')}`
}

export const CommentsTable = ({ comments, ...rest }: CommentListProps) => {
  const { t } = useTranslation()
  const headerCells = useMemo(
    () => [
      { id: 'time', label: t('common.time'), width: 56 },
      { id: 'comment', label: t('danmaku.commentContent') },
    ],
    [t]
  )

  const [orderBy, setOrderBy] = useState(headerCells[0].id)
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')

  const sortedComments = useMemo(() => {
    return match(orderBy)
      .with('comment', () => {
        return comments.toSorted((a, b) => {
          return order === 'asc'
            ? a.m.localeCompare(b.m)
            : b.m.localeCompare(a.m)
        })
      })
      .with('time', () => {
        return comments.toSorted((a, b) => {
          const aTime = parseDanDanCommentParams(a.p).time
          const bTime = parseDanDanCommentParams(b.p).time

          return order === 'asc' ? aTime - bTime : bTime - aTime
        })
      })
      .otherwise(() => comments)
  }, [comments, orderBy, order])

  const ref = useRef<HTMLTableSectionElement>(null)

  const virtualizer = useVirtualizer({
    count: sortedComments.length,
    getScrollElement: () => ref.current,
    estimateSize: () => 32,
  })

  return (
    <TableContainer
      component={Box}
      height="100%"
      overflow="auto"
      {...rest}
      ref={ref}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {headerCells.map((cell) => (
              <TableCell key={cell.id} width={cell.width}>
                <TableSortLabel
                  active={orderBy === cell.id}
                  direction={orderBy === cell.id ? order : 'asc'}
                  onClick={() => {
                    setOrderBy(cell.id)
                    setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                  }}
                >
                  {cell.label}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody
          sx={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
            width: '100%',
          }}
        >
          {sortedComments.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} align="center">
                {t('danmaku.noComments')}
              </TableCell>
            </TableRow>
          )}
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const comment = sortedComments[virtualItem.index]
            const { time } = parseDanDanCommentParams(comment.p)

            return (
              <TableRow
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                  display: 'flex',
                }}
              >
                <TableCell width={56}>{formatTime(time)}</TableCell>
                <TableCell
                  sx={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flexGrow: 1,
                  }}
                >
                  {comment.m}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
