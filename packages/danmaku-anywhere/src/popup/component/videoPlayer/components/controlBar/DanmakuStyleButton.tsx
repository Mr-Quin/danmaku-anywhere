import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { DanmakuStylesForm } from '@/content/common/DanmakuStyles/DanmakuStylesForm'
import { useVideoPlayer } from '@/popup/component/videoPlayer/VideoPlayerContext'
import { Comment } from '@mui/icons-material'
import { Box } from '@mui/material'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { ControlBarButton } from './ControlBarButton'

export const DanmakuStyleButton = () => {
  const { size } = useVideoPlayer()
  const { t } = useTranslation()

  return (
    <ControlBarButton
      buttonId="danmaku-styles-button"
      tooltip={t('danmaku.styles')}
      menu={{
        content: (
          <Box
            p={2}
            sx={{
              overflowX: 'hidden',
              overflowY: 'auto',
              width: 400,
              maxHeight: size[1] - 84,
            }}
          >
            <Suspense fallback={<FullPageSpinner />}>
              <DanmakuStylesForm />
            </Suspense>
          </Box>
        ),
      }}
    >
      <Comment />
    </ControlBarButton>
  )
}
