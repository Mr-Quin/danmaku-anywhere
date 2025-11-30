import { CheckOutlined, CloseOutlined } from '@mui/icons-material'
import { Box, Icon, Stack, styled, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { FancyTypography } from '@/common/components/FancyTypography'
import { useStore } from '@/content/controller/store/store'

interface StatusIndicatorProps {
  text: string
  active: boolean
  fancy?: boolean
}

const _StatusIndicator = ({ text, active, fancy }: StatusIndicatorProps) => {
  return (
    <Stack direction="row" justifyContent="space-between">
      <FancyTypography fancy={fancy}>{text}</FancyTypography>
      <Icon color={active ? 'success' : 'error'}>
        {active ? <CheckOutlined /> : <CloseOutlined />}
      </Icon>
    </Stack>
  )
}

const PreviewBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.success.light,
  color: theme.palette.success.contrastText,
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
}))

export const IntegrationLivePreview = () => {
  const { t } = useTranslation()
  const { mediaInfo } = useStore.use.integration()

  if (!mediaInfo) {
    return null
  }

  return (
    <PreviewBox sx={{ mb: 2 }}>
      <Typography variant="subtitle2" fontWeight="bold">
        Live Preview
      </Typography>
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={2}>
          <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 60 }}>
            {t('anime.title')}:
          </Typography>
          <Typography variant="body2">{mediaInfo.seasonTitle}</Typography>
        </Stack>
        <Stack direction="row" spacing={2}>
          <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 60 }}>
            {t('anime.season')}:
          </Typography>
          <Typography variant="body2">
            {mediaInfo.seasonDecorator ?? 'NULL'}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2}>
          <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 60 }}>
            {t('anime.episode')}:
          </Typography>
          <Typography variant="body2">{mediaInfo.episode}</Typography>
        </Stack>
      </Stack>
    </PreviewBox>
  )
}
