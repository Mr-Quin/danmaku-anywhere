import type {
  EpisodeMeta,
  Season,
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

type SeasonDetailsPageProps = {
  season: Season
  onGoBack: () => void
}

export const SeasonDetailsPage = ({
  season,
  onGoBack,
}: SeasonDetailsPageProps) => {
  return (
    <TabLayout>
      <TabToolbar showBackButton onGoBack={onGoBack} title={season.title} />
      <ErrorBoundary
        fallbackRender={({ error }) => <ErrorMessage message={error.message} />}
      >
        <Suspense fallback={null}>
          <SeasonEpisodeList
            season={season}
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
