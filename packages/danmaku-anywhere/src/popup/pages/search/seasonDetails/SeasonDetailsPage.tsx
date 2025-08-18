import type {
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { BaseEpisodeListItem } from '@/common/components/EpisodeList/BaseEpisodeListItem'
import { EpisodeSearchList } from '@/common/components/EpisodeList/EpisodeSearchList'
import { GenericEpisodeListItem } from '@/common/components/EpisodeList/GenericEpisodeListItem'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { useFetchGenericDanmaku } from '@/common/danmaku/queries/useFetchGenericDanmaku'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { useStore } from '@/popup/store'

export const SeasonDetailsPage = () => {
  const { season } = useStore.use.search()

  const goBack = useGoBack()

  if (!season) return null

  return (
    <TabLayout>
      <TabToolbar title={season.title} showBackButton onGoBack={goBack} />
      <ErrorBoundary
        fallbackRender={({ error }) => <ErrorMessage message={error.message} />}
      >
        <Suspense fallback={null}>
          <EpisodeSearchList
            season={season}
            renderEpisode={(data) => {
              // Calling hooks inside a render prop, but since the list never changes this shouldn't violate the rule of hooks
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
            renderCustomEpisode={(data) => {
              const mutation = useFetchGenericDanmaku()

              return (
                <GenericEpisodeListItem
                  onClick={() => mutation.mutate(data.episode)}
                  isLoading={mutation.isPending}
                  episode={data.episode}
                  danmaku={mutation.data}
                />
              )
            }}
          />
        </Suspense>
      </ErrorBoundary>
    </TabLayout>
  )
}
