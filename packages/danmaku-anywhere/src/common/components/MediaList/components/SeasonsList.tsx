import { SeasonV1 } from '@/common/anime/types/v1/schema'
import { CollapsableListItems } from '@/common/components/MediaList/components/CollapsableListItems'
import { ListItemSkeleton } from '@/common/components/MediaList/components/ListItemSkeleton'
import { MediaTypeIcon } from '@/common/components/MediaList/components/MediaTypeIcon'
import { SeasonListItem } from '@/common/components/MediaList/components/SeasonListItem'
import type { RenderEpisode } from '@/common/components/MediaList/types'
import { ListItemText } from '@mui/material'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

const renderSeasonIcon = (season: SeasonV1) => {
  const { icon, description, primaryText } = {
    icon: season.type,
    description: '',
    primaryText: season.title,
  }

  return (
    <>
      <MediaTypeIcon icon={icon} description={description} />
      <ListItemText primary={primaryText} />
    </>
  )
}

interface SeasonListProps {
  data: SeasonV1[]
  renderEpisode: RenderEpisode
  dense: boolean
}

export const SeasonsList = ({
  data,
  renderEpisode,
  dense,
}: SeasonListProps) => {
  return data.map((season, index) => {
    return (
      <CollapsableListItems
        listItemChildren={renderSeasonIcon(season)}
        key={index}
      >
        <ErrorBoundary fallback={<ListItemText primary="An error occurred" />}>
          <Suspense fallback={<ListItemSkeleton />}>
            <SeasonListItem
              provider={season.provider}
              season={season}
              renderEpisodes={renderEpisode}
              dense={dense}
            />
          </Suspense>
        </ErrorBoundary>
      </CollapsableListItems>
    )
  })
}
