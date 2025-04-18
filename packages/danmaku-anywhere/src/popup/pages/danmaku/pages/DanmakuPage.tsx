import { ChevronLeft } from '@mui/icons-material'
import { Box, IconButton, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'

import { CommentsTable } from '@/common/components/CommentsTable'
import { useDanmakuSuspense } from '@/common/danmaku/queries/useDanmakuSuspense'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { useStore } from '@/popup/store'

export const DanmakuPage = () => {
  const { t } = useTranslation()

  const [searchParams] = useSearchParams()

  const navigate = useNavigate()
  const goBack = useGoBack()

  const id = parseInt(searchParams.get('id')!)

  const { data } = useDanmakuSuspense({ id })

  const { selectedAnime, selectedEpisode } = useStore.use.danmaku()

  return (
    <TabLayout>
      <TabToolbar
        title={`${selectedAnime} - ${selectedEpisode}`}
        leftElement={
          <IconButton edge="start" onClick={goBack}>
            <ChevronLeft />
          </IconButton>
        }
      />
      {data ? (
        <CommentsTable
          comments={data.comments}
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
