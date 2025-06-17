import {
  SeasonCard,
  SeasonCardSkeleton,
} from '@/common/components/MediaList/components/SeasonCard'
import { useMergeRefs } from '@/common/hooks/useMergeRefs'
import { useMeasure } from '@/content/common/hooks/useMeasure'
import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import {
  Box,
  type BoxProps,
  type Breakpoint,
  Grid,
  type GridProps,
  useTheme,
} from '@mui/material'
import { useVirtualizer, useWindowVirtualizer } from '@tanstack/react-virtual'
import { type RefObject, useRef, useState } from 'react'

function useBreakpointValue<T>(
  values: Partial<Record<Breakpoint, T>>,
  width: number,
  fallback: T
): T {
  const theme = useTheme()

  const breakpointWidths = {
    xs: 0,
    sm: theme.breakpoints.values.sm,
    md: theme.breakpoints.values.md,
    lg: theme.breakpoints.values.lg,
    xl: theme.breakpoints.values.xl,
  } satisfies Record<Breakpoint, number>

  const breakpointKeys = [...theme.breakpoints.keys].reverse()

  for (const key of breakpointKeys) {
    if (values[key] !== undefined && width >= breakpointWidths[key]) {
      return values[key]
    }
  }

  return fallback
}

const GRID_COLUMNS = 12

const SeasonGridLayout = (props: GridProps) => {
  return (
    <Grid
      container
      spacing={{ xs: 2, md: 3 }}
      columns={GRID_COLUMNS}
      {...props}
    >
      {props.children}
    </Grid>
  )
}

const useGridLayout = () => {
  const theme = useTheme()
  const [ref, [width]] = useMeasure()

  const lanes = useBreakpointValue(
    {
      xs: 2,
      sm: 4,
      md: 6,
    },
    width,
    2
  )

  const spacing = useBreakpointValue(
    {
      xs: theme.spacing(20),
      md: theme.spacing(3),
    },
    width,
    '8px'
  )

  return {
    lanes,
    spacing,
    ref,
  }
}

interface SeasonGridProps {
  data: (Season | CustomSeason)[]
  onSeasonClick?: (season: Season | CustomSeason) => void
  onSelectionChange?: (selection: (Season | CustomSeason)[]) => void
  selectionModel?: (Season | CustomSeason)[]
  singleSelect?: boolean
  virtualize?: boolean
  disableMenu?: boolean
  enableSelection?: boolean
  boxProps?: BoxProps
  ref?: RefObject<HTMLDivElement | null>
  windowVirtualizer?: boolean
}

export const SeasonGrid = ({
  data,
  onSeasonClick,
  virtualize = false,
  disableMenu,
  enableSelection,
  onSelectionChange,
  singleSelect,
  selectionModel: selectionModelProp,
  boxProps,
  ref: refProp,
  windowVirtualizer = false,
}: SeasonGridProps) => {
  const [selectionModel, setSelectionModel] = useState<
    (Season | CustomSeason)[]
  >(selectionModelProp ?? [])
  const { ref: measureRef, lanes, spacing } = useGridLayout()
  const ref = useRef<HTMLDivElement>(null)

  const mergedRefs = useMergeRefs(ref, refProp)

  const gridSize = GRID_COLUMNS / lanes

  const virtualizer = windowVirtualizer
    ? useWindowVirtualizer({
        count: data.length,
        estimateSize: () => 250,
        getItemKey: (index) => {
          return data[index].id
        },
        gap: parseInt(spacing),
        lanes,
        overscan: 2,
      })
    : useVirtualizer({
        count: data.length,
        getScrollElement: () => ref.current || null,
        estimateSize: () => 250,
        getItemKey: (index) => {
          return data[index].id
        },
        gap: parseInt(spacing),
        lanes,
        overscan: 1,
      })

  const handleSelect = (season: Season | CustomSeason) => {
    if (selectionModel.includes(season)) {
      const selection = singleSelect
        ? []
        : selectionModel.filter((s) => s !== season)
      setSelectionModel(selection)
      onSelectionChange?.(selection)
    } else {
      const selection = singleSelect ? [season] : [...selectionModel, season]
      setSelectionModel(selection)
      onSelectionChange?.(selection)
    }
  }

  if (!virtualize) {
    return (
      <SeasonGridLayout ref={measureRef} spacing={spacing}>
        {data.map((season) => {
          return (
            <Grid size={gridSize} key={season.id}>
              <SeasonCard
                season={season}
                onClick={onSeasonClick}
                disableMenu={disableMenu}
                enableSelection={enableSelection}
                onSelect={handleSelect}
                isSelected={selectionModel.includes(season)}
              />
            </Grid>
          )
        })}
      </SeasonGridLayout>
    )
  }

  return (
    <Box
      height="100%"
      overflow="auto"
      position="relative"
      ref={mergedRefs}
      {...boxProps}
    >
      <SeasonGridLayout
        ref={measureRef}
        spacing={spacing}
        height={virtualizer.getTotalSize()}
        position="relative"
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const season = data[virtualItem.index]
          return (
            <Grid
              size={gridSize}
              sx={{
                position: 'absolute',
                top: 0,
                transform: `translateY(${virtualItem.start}px) translateX(calc(${virtualItem.lane * 100}% + ${virtualItem.lane * parseInt(spacing)}px))`,
              }}
              key={season.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
            >
              <SeasonCard
                season={season}
                onClick={onSeasonClick}
                disableMenu={disableMenu}
                enableSelection={enableSelection}
                onSelect={handleSelect}
                isSelected={selectionModel.includes(season)}
              />
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
  const { ref, lanes, spacing } = useGridLayout()

  const gridSize = GRID_COLUMNS / lanes

  return (
    <SeasonGridLayout ref={ref} spacing={spacing}>
      {Array.from({ length: count }).map((_, index) => {
        return (
          <Grid size={gridSize} key={index}>
            <SeasonCardSkeleton />
          </Grid>
        )
      })}
    </SeasonGridLayout>
  )
}
