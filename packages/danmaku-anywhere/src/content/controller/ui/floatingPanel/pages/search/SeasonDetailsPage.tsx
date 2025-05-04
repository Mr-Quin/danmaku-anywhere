import { ErrorMessage } from '@/common/components/ErrorMessage'
import { SeasonDetails } from '@/common/components/MediaList/components/SeasonDetails'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { usePopup } from '@/content/controller/store/popupStore'
import { EpisodeListItem } from '@/content/controller/ui/floatingPanel/pages/search/EpisodeListItem'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

type SeasonDetailsPageProps = {
  seasonMapKey?: string
}

export const SeasonDetailsPage = ({ seasonMapKey }: SeasonDetailsPageProps) => {
  const { selectedSeason, setSelectedSeason } = usePopup()

  if (!selectedSeason) return null

  return (
    <TabLayout>
      <TabToolbar
        showBackButton
        onGoBack={() => setSelectedSeason(undefined)}
        title={selectedSeason.title}
      />
      <ErrorBoundary
        fallbackRender={({ error }) => <ErrorMessage message={error.message} />}
      >
        <Suspense fallback={null}>
          <SeasonDetails
            season={selectedSeason}
            renderEpisode={(data) => {
              return <EpisodeListItem seasonMapKey={seasonMapKey} data={data} />
            }}
          />
        </Suspense>
      </ErrorBoundary>
    </TabLayout>
  )
}
