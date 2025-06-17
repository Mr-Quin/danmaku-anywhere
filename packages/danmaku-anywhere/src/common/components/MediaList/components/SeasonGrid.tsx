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
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useVirtualizer, useWindowVirtualizer } from '@tanstack/react-virtual'
import { type RefObject, useRef, useState } from 'react'

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

const defaultGridSize = { xs: 2, sm: 2, md: 2 } as const

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
  const [measureRef, [width]] = useMeasure()

  const ref = useRef<HTMLDivElement>(null)

  const mergedRefs = useMergeRefs(ref, refProp, measureRef)

  const theme = useTheme()

  const lanes =
    useBreakpointValue({
      xs: 2,
      sm: 4,
      md: 6,
    }) ?? 2

  const spacing =
    useBreakpointValue({
      xs: theme.spacing(2),
      md: theme.spacing(3),
    }) ?? '8px'

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
      <SeasonGridLayout>
        {data.map((season) => {
          return (
            <Grid size={defaultGridSize} key={season.id}>
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
      <SeasonGridLayout height={virtualizer.getTotalSize()} position="relative">
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const season = data[virtualItem.index]
          return (
            <Grid
              size={defaultGridSize}
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
  return (
    <SeasonGridLayout>
      {Array.from({ length: count }).map((_, index) => {
        return (
          <Grid size={defaultGridSize} key={index}>
            <SeasonCardSkeleton />
          </Grid>
        )
      })}
    </SeasonGridLayout>
  )
}
