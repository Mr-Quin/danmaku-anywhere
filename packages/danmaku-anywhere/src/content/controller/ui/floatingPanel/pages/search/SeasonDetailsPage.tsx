import type {
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { BaseEpisodeListItem } from '@/common/components/MediaList/components/BaseEpisodeListItem'
import { SeasonEpisodeList } from '@/common/components/MediaList/components/SeasonEpisodeList'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { usePopup } from '@/content/controller/store/popupStore'

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
          <SeasonEpisodeList
            season={selectedSeason}
            renderEpisode={(data) => {
              const { loadMutation } = useLoadDanmaku()

              const handleFetchDanmaku = async (
                meta: WithSeason<EpisodeMeta>
              ) => {
                await loadMutation.mutateAsync({
                  meta,
                  options: {
                    forceUpdate: true,
                  },
                  context: {
                    seasonMapKey,
                  },
                })
              }

              return (
                <BaseEpisodeListItem
                  episode={data.danmaku ?? data.episode}
                  isLoading={loadMutation.isPending || data.isLoading}
                  onClick={handleFetchDanmaku}
                />
              )
            }}
          />
        </Suspense>
      </ErrorBoundary>
    </TabLayout>
  )
}
