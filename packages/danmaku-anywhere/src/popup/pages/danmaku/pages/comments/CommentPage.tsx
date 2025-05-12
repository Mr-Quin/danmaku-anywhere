import { Box } from '@mui/material'
import { useNavigate, useParams, useSearchParams } from 'react-router'

import { useGetSeasonSuspense } from '@/common/anime/queries/useSeasons'
import { CommentsTable } from '@/common/components/CommentsTable'
import { NothingHere } from '@/common/components/NothingHere'
import { useAllCustomEpisodesSuspense } from '@/common/danmaku/queries/useAllCustomEpisodes'
import { useDanmakuManySuspense } from '@/common/danmaku/queries/useDanmakuMany'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useGoBack } from '@/popup/hooks/useGoBack'

export const CommentPage = () => {
  const navigate = useNavigate()
  const goBack = useGoBack()

  const [searchParams] = useSearchParams()

  const isCustom = searchParams.get('type') === 'custom'

  const params = useParams()

  const episodeId = params.episodeId ? parseInt(params.episodeId) : 0

  const getData = () => {
    if (isCustom) {
      const episodes = useAllCustomEpisodesSuspense()

      const episode = episodes.data.find((episode) => episode.id === episodeId)

      if (!episode) {
        return {
          title: 'Custom',
          comments: [],
        }
      }

      return {
        title: episode.title,
        comments: episode.comments,
      }
    } else {
      const params = useParams()

      const seasonId = params.seasonId ? parseInt(params.seasonId) : 0

      const {
        data: [season],
      } = useGetSeasonSuspense({
        id: seasonId,
      })

      const {
        data: [episode],
      } = useDanmakuManySuspense({ id: episodeId })

      return {
        title: `${season.title} - ${episode.title}`,
        comments: episode.comments,
      }
    }
  }

  const { title, comments } = getData()

  return (
    <TabLayout>
      <TabToolbar title={title} showBackButton onGoBack={goBack} />
      {comments ? (
        <CommentsTable
          comments={comments}
          onFilterComment={(comment) =>
            navigate('/styles/filtering', { state: comment })
          }
        />
      ) : (
        <Box p={2} flexGrow={1}>
          <NothingHere />
        </Box>
      )}
    </TabLayout>
  )
}
