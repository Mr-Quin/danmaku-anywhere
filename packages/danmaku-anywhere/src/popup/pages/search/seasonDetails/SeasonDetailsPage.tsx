import {
  DanmakuSourceType,
  type EpisodeMeta,
  type WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { BaseEpisodeListItem } from '@/common/components/EpisodeList/BaseEpisodeListItem'
import { EpisodeSearchList } from '@/common/components/EpisodeList/EpisodeSearchList'
import { MacCmsEpisodeListItem } from '@/common/components/EpisodeList/MacCmsEpisodeListItem'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { useFetchGenericDanmaku } from '@/common/danmaku/queries/useFetchGenericDanmaku'
import { assertProviderConfigImpl } from '@/common/options/providerConfig/utils'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { useStore } from '@/popup/store'

export const SeasonDetailsPage = () => {
  const { season, provider } = useStore.use.search()

  const goBack = useGoBack()

  if (!season || !provider) return null

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
                  type: 'by-meta',
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

              assertProviderConfigImpl(provider, DanmakuSourceType.MacCMS)

              return (
                <MacCmsEpisodeListItem
                  onClick={() =>
                    mutation.mutate({
                      ...data.episode,
                      providerConfigId: provider.id,
                    })
                  }
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
