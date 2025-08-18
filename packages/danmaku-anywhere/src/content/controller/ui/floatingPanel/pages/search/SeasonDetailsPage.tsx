import type {
  CustomSeason,
  EpisodeMeta,
  Season,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { BaseEpisodeListItem } from '@/common/components/EpisodeList/BaseEpisodeListItem'
import { EpisodeSearchList } from '@/common/components/EpisodeList/EpisodeSearchList'
import { GenericEpisodeListItem } from '@/common/components/EpisodeList/GenericEpisodeListItem'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'

type SeasonDetailsPageProps = {
  season: Season | CustomSeason
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
          <EpisodeSearchList
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
            renderCustomEpisode={(data) => {
              const { loadGenericMutation } = useLoadDanmaku()

              return (
                <GenericEpisodeListItem
                  episode={data.episode}
                  onClick={() => loadGenericMutation.mutate(data.episode)}
                  isLoading={loadGenericMutation.isPending}
                  danmaku={loadGenericMutation.data}
                />
              )
            }}
          />
        </Suspense>
      </ErrorBoundary>
    </TabLayout>
  )
}
