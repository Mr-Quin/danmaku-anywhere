import {
  DanmakuSourceType,
  type GenericEpisode,
} from '@danmaku-anywhere/danmaku-converter'
import { Box } from '@mui/material'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useGetSeasonSuspense } from '@/common/anime/queries/useSeasons'
import { CommentsTable } from '@/common/components/CommentsTable'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { NothingHere } from '@/common/components/NothingHere'
import { useCustomEpisodeSuspense } from '@/common/danmaku/queries/useCustomEpisodes'
import { useEpisodesSuspense } from '@/common/danmaku/queries/useEpisodes'
import { isProvider } from '@/common/danmaku/utils'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { useRefreshDanmaku } from '@/popup/hooks/useRefreshDanmaku'

export const CommentPage = () => {
  const navigate = useNavigate()
  const goBack = useGoBack()

  const [searchParams] = useSearchParams()

  const isCustom = searchParams.get('type') === 'custom'

  const params = useParams()

  const { refreshDanmaku, ...mutation } = useRefreshDanmaku()

  const episodeId = params.episodeId ? Number.parseInt(params.episodeId) : 0

  const getData = (): {
    title: string
    episode: GenericEpisode | null
  } => {
    if (isCustom) {
      const episodes = useCustomEpisodeSuspense({ id: episodeId })

      const episode = episodes.data[0]

      if (!episode) {
        return {
          title: 'Custom',
          episode: null,
        }
      }

      return {
        title: episode.title,
        episode,
      }
    }
    const params = useParams()

    const seasonId = params.seasonId ? Number.parseInt(params.seasonId) : 0

    const {
      data: [season],
    } = useGetSeasonSuspense({
      id: seasonId,
    })

    const {
      data: [episode],
    } = useEpisodesSuspense({ id: episodeId })

    return {
      title: `${season.title} - ${episode.title}`,
      episode,
    }
  }

  const { title, episode } = getData()

  const canRefresh =
    episode !== null && !isProvider(episode, DanmakuSourceType.MacCMS)

  const handleRefresh = () => {
    if (!canRefresh) {
      return
    }
    void refreshDanmaku(episode)
  }

  return (
    <TabLayout>
      <TabToolbar title={title} showBackButton onGoBack={goBack} />
      {episode ? (
        <CommentsTable
          comments={episode.comments}
          onFilterComment={(comment) =>
            navigate('/styles/filtering', { state: comment })
          }
          onRefresh={handleRefresh}
          showRefresh={canRefresh}
          isRefreshing={mutation.isPending}
        />
      ) : (
        <Box p={2} flexGrow={1}>
          <NothingHere />
        </Box>
      )}
    </TabLayout>
  )
}
