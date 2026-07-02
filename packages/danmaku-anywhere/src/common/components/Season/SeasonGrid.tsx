import type {
  CustomSeason,
  Season,
  SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import {
  type BoxProps,
  type Breakpoint,
  Grid,
  type GridProps,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useVirtualizer } from '@tanstack/react-virtual'
import { type RefObject, useRef, useState } from 'react'
import { isPersistedSeason } from '@/common/anime/utils'
import {
  SeasonCard,
  SeasonCardSkeleton,
} from '@/common/components/Season/components/SeasonCard/SeasonCard'
import { seasonSourceKey } from '@/common/danmaku/seasonLabel'
import { useMergeRefs } from '@/common/hooks/useMergeRefs'
import { ScrollBox } from '../layout/ScrollBox'

type SeasonOrInsert = Season | SeasonInsert | CustomSeason

function itemKey(season: SeasonOrInsert): string | number {
  if (isPersistedSeason(season)) {
    return season.id
  }
  return `${seasonSourceKey(season)}-${season.indexedId}`
}

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

interface SeasonGridProps {
  data: SeasonOrInsert[]
  onSeasonClick?: (season: SeasonOrInsert) => void
  onSelectionChange?: (selection: SeasonOrInsert[]) => void
  selectionModel?: SeasonOrInsert[]
  singleSelect?: boolean
  virtualize?: boolean
  disableMenu?: boolean
  enableSelection?: boolean
  boxProps?: BoxProps
  ref?: RefObject<HTMLDivElement | null>
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
}: SeasonGridProps) => {
  const [selectionModel, setSelectionModel] = useState<SeasonOrInsert[]>(
    selectionModelProp ?? []
  )

  const ref = useRef<HTMLDivElement>(null)

  const mergedRefs = useMergeRefs(ref, refProp)

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
      return itemKey(data[index])
    },
    gap: Number.parseInt(spacing),
    lanes,
    overscan: 3,
  })

  const gridSize = { xs: 2, sm: 4, md: 4 }

  const handleSelect = (season: SeasonOrInsert) => {
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
            <Grid size={gridSize} key={itemKey(season)}>
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
    <ScrollBox
      sx={{
        height: '100%',
        overflow: 'auto',
        position: 'relative',
      }}
      ref={mergedRefs}
      {...boxProps}
    >
      <SeasonGridLayout
        sx={{ height: virtualizer.getTotalSize(), position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const season = data[virtualItem.index]
          return (
            <Grid
              size={{ xs: 2, sm: 4, md: 4 }}
              sx={{
                position: 'absolute',
                top: 0,
                transform: `translateY(${virtualItem.start}px) translateX(calc(${virtualItem.lane * 100}% + ${virtualItem.lane * Number.parseInt(spacing)}px))`,
              }}
              key={itemKey(season)}
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
    </ScrollBox>
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
