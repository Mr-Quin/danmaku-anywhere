import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { parseCommentEntityP } from '@danmaku-anywhere/danmaku-converter'
import type { BoxProps } from '@mui/material'
import {
  Box,
  Button,
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

interface CommentListProps {
  comments: CommentEntity[]
  boxProps?: BoxProps
  isTimeClickable?: boolean
  onTimeClick?: (time: number) => void
  onFilterComment?: (comment: string) => void
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds
  ).padStart(2, '0')}`
}

export const CommentsTable = ({
  comments,
  boxProps,
  isTimeClickable,
  onFilterComment,
  onTimeClick,
}: CommentListProps) => {
  const { t } = useTranslation()

  const headerCells = useMemo(
    () =>
      [
        { id: 'time', label: t('common.time'), width: 56 },
        { id: 'comment', label: t('danmaku.commentContent') },
      ] satisfies { id: 'time' | 'comment'; label: string; width?: number }[],
    [t]
  )

  const [orderBy, setOrderBy] = useState<'time' | 'comment'>(headerCells[0].id)
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [hoverRow, setHoverRow] = useState<number>()

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
          const aTime = parseCommentEntityP(a.p).time
          const bTime = parseCommentEntityP(b.p).time

          return order === 'asc' ? aTime - bTime : bTime - aTime
        })
      })
      .exhaustive()
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
      {...boxProps}
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
            const { time } = parseCommentEntityP(comment.p)
            const isHovering = hoverRow === virtualItem.index

            return (
              <TableRow
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                  display: 'flex',
                }}
                onMouseOver={() => setHoverRow(virtualItem.index)}
              >
                <TableCell
                  width={56}
                  style={{
                    flexShrink: 0,
                  }}
                  sx={{
                    color:
                      isTimeClickable && isHovering
                        ? 'primary.main'
                        : 'text.primary',
                  }}
                  onClick={() => onTimeClick?.(time)}
                >
                  <span
                    style={{
                      cursor:
                        isTimeClickable && isHovering ? 'pointer' : 'unset',
                    }}
                  >
                    {formatTime(time)}
                  </span>
                </TableCell>
                <TableCell
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flexGrow: 1,
                  }}
                  title={comment.m}
                >
                  {comment.m}
                </TableCell>
                {isHovering && (
                  <TableCell
                    sx={{
                      position: 'absolute',
                      right: 2,
                      display: 'flex',
                      gap: 1,
                    }}
                  >
                    <Button
                      variant="contained"
                      size="small"
                      sx={{ height: 0.75 }}
                      onClick={() =>
                        void navigator.clipboard.writeText(comment.m)
                      }
                    >
                      {t('common.copy')}
                    </Button>
                    {onFilterComment && (
                      <Button
                        variant="contained"
                        size="small"
                        sx={{ height: 0.75 }}
                        onClick={() => onFilterComment(comment.m)}
                      >
                        {t('common.filter')}
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
