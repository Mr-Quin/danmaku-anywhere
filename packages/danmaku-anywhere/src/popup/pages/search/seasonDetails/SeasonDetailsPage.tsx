import { ErrorMessage } from '@/common/components/ErrorMessage'
import { BaseEpisodeListItem } from '@/common/components/MediaList/components/BaseEpisodeListItem'
import { SeasonEpisodeList } from '@/common/components/MediaList/components/SeasonEpisodeList'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useStore } from '@/popup/store'
import type {
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

export const SeasonDetailsPage = () => {
  const { season } = useStore.use.search()

  if (!season) return null

  return (
    <TabLayout>
      <TabToolbar title={season.title} />
      <ErrorBoundary
        fallbackRender={({ error }) => <ErrorMessage message={error.message} />}
      >
        <Suspense fallback={null}>
          <SeasonEpisodeList
            season={season}
            renderEpisode={(data) => {
              const { mutateAsync: load, isPending } = useFetchDanmaku()

              const handleFetchDanmaku = async (
                meta: WithSeason<EpisodeMeta>
              ) => {
                return await load({
                  meta,
                  options: {
                    forceUpdate: true,
                  },
                })
              }

              return (
                <BaseEpisodeListItem
                  isLoading={isPending || data.isLoading}
                  episode={data.danmaku ?? data.episode}
                  onClick={(meta) => handleFetchDanmaku(meta)}
                />
              )
            }}
          />
        </Suspense>
      </ErrorBoundary>
    </TabLayout>
  )
}
