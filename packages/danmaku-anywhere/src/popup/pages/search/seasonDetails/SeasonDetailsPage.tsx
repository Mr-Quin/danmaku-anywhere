import { ErrorMessage } from '@/common/components/ErrorMessage'
import { BaseEpisodeListItem } from '@/common/components/MediaList/components/BaseEpisodeListItem'
import { SeasonDetails } from '@/common/components/MediaList/components/SeasonDetails'
import type { DanmakuFetchDto } from '@/common/danmaku/dto'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useStore } from '@/popup/store'
import { ChevronLeft } from '@mui/icons-material'
import { IconButton } from '@mui/material'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Link } from 'react-router'

export const SeasonDetailsPage = () => {
  const { season } = useStore.use.search()

  const { mutateAsync: load } = useFetchDanmaku()

  if (!season) return null

  const handleFetchDanmaku = async (meta: DanmakuFetchDto['meta']) => {
    return await load({
      meta,
      options: {
        forceUpdate: true,
      },
    } as DanmakuFetchDto)
  }

  return (
    <TabLayout>
      <TabToolbar
        title={season.title}
        leftElement={
          <IconButton edge="start" component={Link} to="..">
            <ChevronLeft />
          </IconButton>
        }
      />
      <ErrorBoundary
        fallbackRender={({ error }) => <ErrorMessage message={error.message} />}
      >
        <Suspense fallback={null}>
          <SeasonDetails
            season={season}
            renderEpisode={(data) => {
              return (
                <BaseEpisodeListItem
                  data={data}
                  showIcon
                  mutateDanmaku={(meta) => handleFetchDanmaku(meta)}
                />
              )
            }}
          />
        </Suspense>
      </ErrorBoundary>
    </TabLayout>
  )
}
