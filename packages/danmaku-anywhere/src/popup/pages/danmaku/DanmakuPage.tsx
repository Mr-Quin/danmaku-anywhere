import { ChevronLeft } from '@mui/icons-material'
import { Box, IconButton, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { CommentsTable } from '@/common/components/CommentsTable'
import { useDanmakuQuerySuspense } from '@/common/queries/danmaku/useDanmakuQuerySuspense'
import type { DanmakuType } from '@/common/types/danmaku/Danmaku'
import { TabToolbar } from '@/popup/component/TabToolbar'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { TabLayout } from '@/popup/layout/TabLayout'
import { useStore } from '@/popup/store'

export const DanmakuPage = () => {
  const { t } = useTranslation()

  const [searchParams] = useSearchParams()

  const goBack = useGoBack()

  const type = parseInt(searchParams.get('type')!) as DanmakuType
  const id = parseInt(searchParams.get('id')!)

  const { data } = useDanmakuQuerySuspense({
    type,
    id,
  })

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
        <CommentsTable comments={data.comments} flexGrow={1} height="initial" />
      ) : (
        <Box p={2}>
          <Typography>{t('error.unknown')}</Typography>
        </Box>
      )}
    </TabLayout>
  )
}
