import {
  SeasonCard,
  SeasonCardSkeleton,
} from '@/common/components/MediaList/components/SeasonCard'
import type { HandleSeasonClick } from '@/common/components/MediaList/types'
import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import {
  Box,
  type Breakpoint,
  Grid,
  type GridProps,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

const useBreakpointValue = <T,>(values: Partial<Record<Breakpoint, T>>) => {
  const theme = useTheme()

  const mediaQueryResults = {
    xs: useMediaQuery(theme.breakpoints.up('xs')),
    sm: useMediaQuery(theme.breakpoints.up('sm')),
    md: useMediaQuery(theme.breakpoints.up('md')),
    lg: useMediaQuery(theme.breakpoints.up('lg')),
    xl: useMediaQuery(theme.breakpoints.up('xl')),
  }

  const breakpointKeys = theme.breakpoints.keys.toReversed()

  for (const key of breakpointKeys) {
    if (values[key] !== undefined && mediaQueryResults[key]) {
      return values[key]
    }
  }
}

const SeasonGridLayout = (props: GridProps) => {
  return (
    <Grid
      container
      spacing={{ xs: 2, md: 3 }}
      columns={{ xs: 4, sm: 8, md: 12 }}
      {...props}
    >
      {props.children}
    </Grid>
  )
}

interface SeasonListProps {
  data: (Season | CustomSeason)[]
  onSeasonClick: HandleSeasonClick
  virtualize?: boolean
}

export const SeasonGrid = ({
  data,
  onSeasonClick,
  virtualize = false,
}: SeasonListProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const theme = useTheme()

  const lanes =
    useBreakpointValue({
      xs: 2,
      sm: 2,
      md: 3,
    }) ?? 2

  const spacing =
    useBreakpointValue({
      xs: theme.spacing(2),
      md: theme.spacing(3),
    }) ?? '8px'

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => ref.current || null,
    estimateSize: () => 250,
    getItemKey: (index) => {
      return data[index].id
    },
    gap: parseInt(spacing),
    lanes,
    overscan: 3,
  })

  const gridSize = { xs: 2, sm: 4, md: 4 }

  if (!virtualize) {
    return (
      <SeasonGridLayout>
        {data.map((season) => {
          return (
            <Grid size={gridSize} key={season.id}>
              <SeasonCard season={season} onClick={onSeasonClick} />
            </Grid>
          )
        })}
      </SeasonGridLayout>
    )
  }

  return (
    <Box height="100%" overflow="auto" position="relative" p={2} ref={ref}>
      <SeasonGridLayout height={virtualizer.getTotalSize()} position="relative">
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const season = data[virtualItem.index]
          return (
            <Grid
              size={{ xs: 2, sm: 4, md: 4 }}
              sx={{
                position: 'absolute',
                top: 0,
                // left: `calc(${virtualItem.lane * (100 / lanes)}% + ${virtualItem.lane * parseInt(spacing)}px)`,
                transform: `translateY(${virtualItem.start}px) translateX(calc(${virtualItem.lane * 100}% + ${virtualItem.lane * parseInt(spacing)}px))`,
              }}
              key={season.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
            >
              <SeasonCard season={season} onClick={onSeasonClick} />
            </Grid>
          )
        })}
      </SeasonGridLayout>
    </Box>
  )
}

type SeasonGridSkeletonProps = {
  count?: number
}
export const SeasonGridSkeleton = ({ count = 4 }: SeasonGridSkeletonProps) => {
  return (
    <SeasonGridLayout>
      {Array.from({ length: count }).map((_, index) => {
        return (
          <Grid size={{ xs: 2, sm: 4, md: 4 }} key={index}>
            <SeasonCardSkeleton />
          </Grid>
        )
      })}
    </SeasonGridLayout>
  )
}
