import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { parseCommentEntityP } from '@danmaku-anywhere/danmaku-converter'
import {
  compile,
  type Decision,
  STAGE_DURATION_MS,
} from '@danmaku-anywhere/danmaku-engine'
import { ContentCopy, FilterList, Sync } from '@mui/icons-material'
import {
  Box,
  Chip,
  type ChipProps,
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
import { useDanmakuOptions } from '@/common/options/danmakuOptions/useDanmakuOptions'
import { compareLocale } from '@/common/utils/collator'
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

function chipFor(
  decision: Decision,
  headLabelOf: (idx: number) => string,
  t: ReturnType<typeof useTranslation>['t']
): { label: string; color: ChipProps['color'] } | null {
  switch (decision.kind) {
    case 'block':
      return {
        label: t('danmaku.disposition.blocked', 'Blocked'),
        color: 'error',
      }
    case 'whitelist':
      return {
        label: t('danmaku.disposition.whitelist', 'White list'),
        color: 'info',
      }
    case 'head':
      return {
        label: t(
          'danmaku.disposition.collapseHead',
          'Collapse head: {{label}} ×{{count}}',
          { label: decision.label, count: decision.finalCount }
        ),
        color: 'secondary',
      }
    case 'absorbed':
      return {
        label: t(
          'danmaku.disposition.collapsed',
          'Collapsed: {{label}} ×{{count}}',
          {
            label: headLabelOf(decision.headIndex),
            count: decision.count,
          }
        ),
        color: 'secondary',
      }
    case 'dedupe':
      return {
        label: t('danmaku.disposition.duplicate', 'Duplicate'),
        color: 'default',
      }
    case 'normal':
      return null
  }
}

function DispositionChip({
  decision,
  headLabelOf,
}: {
  decision: Decision
  headLabelOf: (idx: number) => string
}) {
  const { t } = useTranslation()
  const props = chipFor(decision, headLabelOf, t)
  if (!props) return null
  return (
    <Chip
      label={props.label}
      color={props.color}
      variant="outlined"
      sx={{ flexShrink: 0 }}
    />
  )
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
  const { data: danmakuOptions } = useDanmakuOptions()

  const headerCells = useMemo(
    () =>
      [
        { id: 'time', label: t('common.time', 'Time'), width: 56 },
        { id: 'comment', label: t('danmaku.commentContent', 'Comment') },
      ] satisfies { id: 'time' | 'comment'; label: string; width?: number }[],
    [t]
  )

  const [orderBy, setOrderBy] = useState<'time' | 'comment'>(headerCells[0].id)
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [hoverRow, setHoverRow] = useState<number>()
  const [filter, setFilter] = useState('')

  const timeOf = useMemo(() => {
    const map = new Map<CommentEntity, number>()
    for (const c of comments) map.set(c, parseCommentEntityP(c.p).time)
    return (c: CommentEntity) => map.get(c) ?? 0
  }, [comments])

  const { decisionByComment, headLabelByIndex } = useMemo(() => {
    const inTimeOrder = comments.toSorted((a, b) => timeOf(a) - timeOf(b))
    const { decisions } = compile(
      inTimeOrder.map((c) => ({ text: c.m, time: timeOf(c) })),
      {
        filters: danmakuOptions.filters,
        collapse: danmakuOptions.collapse,
        stageDurationSec:
          STAGE_DURATION_MS / 1000 / Math.max(danmakuOptions.speed, 0.1),
      }
    )
    const decisionByComment = new Map<CommentEntity, Decision>()
    const headLabelByIndex = new Map<number, string>()
    inTimeOrder.forEach((c, i) => {
      decisionByComment.set(c, decisions[i])
      const d = decisions[i]
      if (d.kind === 'head') headLabelByIndex.set(i, d.label)
    })
    return { decisionByComment, headLabelByIndex }
  }, [
    comments,
    timeOf,
    danmakuOptions.filters,
    danmakuOptions.collapse,
    danmakuOptions.speed,
  ])

  const filteredComments = useMemo(() => {
    const keyword = filter.trim().toLowerCase()
    const withDecision = comments.map((c) => ({
      comment: c,
      decision: decisionByComment.get(c) ?? ({ kind: 'normal' } as Decision),
    }))
    if (!keyword) return withDecision
    return withDecision.filter(({ comment }) =>
      comment.m.toLowerCase().includes(keyword)
    )
  }, [comments, decisionByComment, filter])

  const sortedComments = useMemo(() => {
    return match(orderBy)
      .with('comment', () => {
        return filteredComments.toSorted((a, b) => {
          return order === 'asc'
            ? compareLocale(a.comment.m, b.comment.m)
            : compareLocale(b.comment.m, a.comment.m)
        })
      })
      .with('time', () => {
        return filteredComments.toSorted((a, b) => {
          const diff = timeOf(a.comment) - timeOf(b.comment)
          return order === 'asc' ? diff : -diff
        })
      })
      .exhaustive()
  }, [filteredComments, orderBy, order, timeOf])

  const headLabelOf = (idx: number) => headLabelByIndex.get(idx) ?? ''

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
          {t('danmaku.commentCounted', { count: sortedComments.length })}
        </Typography>
        <FilterButton filter={filter} onChange={setFilter} />
        {showRefresh && (
          <Tooltip title={t('danmaku.refresh', 'Refresh Danmaku')}>
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
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {renderToolbar()}
      <TableContainer
        component={ScrollBox}
        sx={{ flex: 1, overflow: 'auto' }}
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
                  {t('danmaku.noComments', 'No comments')}
                </TableCell>
              </TableRow>
            )}
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const { comment, decision } = sortedComments[virtualItem.index]
              const time = timeOf(comment)
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
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title={comment.m}
                  >
                    <Typography
                      variant="body2"
                      title={comment.m}
                      sx={{
                        flexGrow: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        opacity: decision.kind === 'block' ? 0.5 : 1,

                        textDecoration:
                          decision.kind === 'block' ? 'line-through' : 'none',
                      }}
                    >
                      {comment.m}
                    </Typography>
                    <DispositionChip
                      decision={decision}
                      headLabelOf={headLabelOf}
                    />
                    {isHovering && (
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title={t('common.copy', 'Copy')}>
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
                          <Tooltip title={t('common.filter', 'Filter')}>
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
