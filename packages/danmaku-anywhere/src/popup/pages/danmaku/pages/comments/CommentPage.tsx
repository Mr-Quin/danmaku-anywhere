import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'

import { useGetSeasonSuspense } from '@/common/anime/queries/useSeasonsSuspense'
import { CommentsTable } from '@/common/components/CommentsTable'
import { useDanmakuManySuspense } from '@/common/danmaku/queries/useDanmakuManySuspense'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useGoBack } from '@/popup/hooks/useGoBack'

export const CommentPage = () => {
  const { t } = useTranslation()

  const navigate = useNavigate()
  const goBack = useGoBack()

  const params = useParams()

  const seasonId = params.seasonId ? parseInt(params.seasonId) : 0
  const episodeId = params.episodeId ? parseInt(params.episodeId) : 0

  const {
    data: [season],
  } = useGetSeasonSuspense({
    id: seasonId,
  })

  const {
    data: [episode],
  } = useDanmakuManySuspense({ id: episodeId })

  return (
    <TabLayout>
      <TabToolbar
        title={`${season.title} - ${episode.title}`}
        showBackButton
        onGoBack={goBack}
      />
      {episode ? (
        <CommentsTable
          comments={episode.comments}
          boxProps={{
            flexGrow: 1,
            height: 'initial',
          }}
          onFilterComment={(comment) =>
            navigate('/styles/filtering', { state: comment })
          }
        />
      ) : (
        <Box p={2}>
          <Typography>{t('error.unknown')}</Typography>
        </Box>
      )}
    </TabLayout>
  )
}
