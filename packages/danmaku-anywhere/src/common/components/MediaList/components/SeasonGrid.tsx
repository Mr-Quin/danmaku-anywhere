import { SeasonV1 } from '@/common/anime/types/v1/schema'
import {
  SeasonCard,
  SeasonCardSkeleton,
} from '@/common/components/MediaList/components/SeasonCard'
import { HandleSeasonClick } from '@/common/components/MediaList/types'
import { Grid } from '@mui/material'

interface SeasonListProps {
  data: SeasonV1[]
  onSeasonClick: HandleSeasonClick
}

export const SeasonGrid = ({ data, onSeasonClick }: SeasonListProps) => {
  return (
    <Grid
      container
      spacing={{ xs: 2, md: 3 }}
      columns={{ xs: 4, sm: 8, md: 12 }}
    >
      {data.map((season) => {
        return (
          <Grid size={{ xs: 2, sm: 4, md: 4 }} key={season.id}>
            <SeasonCard season={season} onClick={onSeasonClick} />
          </Grid>
        )
      })}
    </Grid>
  )
}

export const SeasonGridSkeleton = () => {
  return (
    <Grid
      container
      spacing={{ xs: 2, md: 3 }}
      columns={{ xs: 4, sm: 8, md: 12 }}
    >
      {Array.from({ length: 3 }).map((_, index) => {
        return (
          <Grid size={{ xs: 2, sm: 4, md: 4 }} key={index}>
            <SeasonCardSkeleton />
          </Grid>
        )
      })}
    </Grid>
  )
}
