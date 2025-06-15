import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { DanmakuStylesForm } from '@/content/common/DanmakuStyles/DanmakuStylesForm'
import { Comment } from '@mui/icons-material'
import { Box } from '@mui/material'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { ControlBarButton } from './ControlBarButton'

export const DanmakuStyleButton = () => {
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
              height: 600,
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
