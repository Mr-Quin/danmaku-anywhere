import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { parseCommentEntityP } from '@danmaku-anywhere/danmaku-converter'
import { ContentCopy, FilterList, Sync } from '@mui/icons-material'
import {
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { match } from 'ts-pattern'
import { FilterButton } from '@/common/components/FilterButton'
import { ScrollBox } from './layout/ScrollBox'

interface CommentListProps {
  comments: CommentEntity[]
  isTimeClickable?: boolean
  onTimeClick?: (time: number) => void
  onFilterComment?: (comment: string) => void
  onRefresh?: () => void
  showRefresh?: boolean
  isRefreshing?: boolean
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
  isTimeClickable,
  onFilterComment,
  onTimeClick,
  onRefresh,
  isRefreshing,
  showRefresh,
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
  const [filter, setFilter] = useState('')

  const filteredComments = useMemo(() => {
    const keyword = filter.trim().toLowerCase()
    if (!keyword) {
      return comments
    }
    return comments.filter((c) => c.m.toLowerCase().includes(keyword))
  }, [comments, filter])

  const sortedComments = useMemo(() => {
    return match(orderBy)
      .with('comment', () => {
        return filteredComments.toSorted((a, b) => {
          return order === 'asc'
            ? a.m.localeCompare(b.m)
            : b.m.localeCompare(a.m)
        })
      })
      .with('time', () => {
        return filteredComments.toSorted((a, b) => {
          const aTime = parseCommentEntityP(a.p).time
          const bTime = parseCommentEntityP(b.p).time

          return order === 'asc' ? aTime - bTime : bTime - aTime
        })
      })
      .exhaustive()
  }, [filteredComments, orderBy, order])

  const ref = useRef<HTMLTableSectionElement>(null)

  const virtualizer = useVirtualizer({
    count: sortedComments.length,
    getScrollElement: () => ref.current,
    estimateSize: () => 32,
  })

  const renderToolbar = () => {
    return (
      <Toolbar
        variant="dense"
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          minHeight: 32,
          backgroundColor: 'background.paper',
          gap: 1,
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {t('danmaku.commentCounted', { count: comments.length })}
        </Typography>
        <FilterButton filter={filter} onChange={setFilter} />
        {showRefresh && (
          <Tooltip title={t('danmaku.refresh')}>
            <IconButton
              color="primary"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? <CircularProgress size={24} /> : <Sync />}
            </IconButton>
          </Tooltip>
        )}
      </Toolbar>
    )
  }

  return (
    <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
      {renderToolbar()}
      <TableContainer component={ScrollBox} flex={1} overflow="auto" ref={ref}>
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
                    height: 32,
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
                      display: 'flex',
                    }}
                    title={comment.m}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={comment.m}
                      flexGrow={1}
                    >
                      {comment.m}
                    </Typography>
                    {isHovering && (
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title={t('common.copy')}>
                          <IconButton
                            size="small"
                            onClick={() =>
                              navigator.clipboard.writeText(comment.m)
                            }
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {onFilterComment && (
                          <Tooltip title={t('common.filter')}>
                            <IconButton
                              size="small"
                              onClick={() => onFilterComment(comment.m)}
                            >
                              <FilterList fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
