import {
  type CustomSeason,
  DanmakuSourceType,
  type EpisodeMeta,
  type Season,
  type WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { BaseEpisodeListItem } from '@/common/components/EpisodeList/BaseEpisodeListItem'
import { EpisodeSearchList } from '@/common/components/EpisodeList/EpisodeSearchList'
import { MacCmsEpisodeListItem } from '@/common/components/EpisodeList/MacCmsEpisodeListItem'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { assertProviderConfigImpl } from '@/common/options/providerConfig/utils'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { usePopup } from '@/content/controller/store/popupStore'

type SeasonDetailsPageProps = {
  season: Season | CustomSeason
  onGoBack: () => void
}

export const SeasonDetailsPage = ({
  season,
  onGoBack,
}: SeasonDetailsPageProps) => {
  const { providerTab } = usePopup()

  if (!providerTab) return null

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

              assertProviderConfigImpl(providerTab, DanmakuSourceType.MacCMS)

              return (
                <MacCmsEpisodeListItem
                  episode={data.episode}
                  onClick={() =>
                    loadGenericMutation.mutate({
                      ...data.episode,
                      providerOptions: providerTab.options,
                    })
                  }
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
