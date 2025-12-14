import { Box, Button, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { SuspenseImage } from '@/common/components/image/SuspenseImage'

import { IMAGE_ASSETS } from '@/images/ImageAssets'

interface EmptyMountConfigListProps {
  onCreate: () => void
}

export const EmptyMountConfigList = ({
  onCreate,
}: EmptyMountConfigListProps) => {
  const { t } = useTranslation()
  return (
    <Box>
      <Stack p={2} pt={8} alignItems="center" zIndex={2} position="relative">
        <Typography mb={2}>
          {t('configPage.noConfigs', 'No configs configured...')}
        </Typography>
        <Button
          onClick={onCreate}
          variant="text"
          sx={{ textTransform: 'none' }}
        >
          {t('configPage.goCreate', 'Go create one')}
        </Button>
      </Stack>
      <SuspenseImage
        src={IMAGE_ASSETS.DrawCircle}
        sx={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
        height={300}
        cache={false}
      />
    </Box>
  )
}
