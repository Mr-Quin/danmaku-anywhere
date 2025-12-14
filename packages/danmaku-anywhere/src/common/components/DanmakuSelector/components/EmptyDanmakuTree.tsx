import { Box, Button, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { SuspenseImage } from '@/common/components/image/SuspenseImage'

import { IMAGE_ASSETS } from '@/images/ImageAssets'

interface EmptyDanmakuTreeProps {
  onImport: () => void
  onGoSearch: () => void
}

export const EmptyDanmakuTree = ({
  onImport,
  onGoSearch,
}: EmptyDanmakuTreeProps) => {
  const { t } = useTranslation()

  return (
    <Box height={1} position="relative">
      <Stack p={4} alignItems="center" zIndex={2} position="relative">
        <Typography mb={2}>
          {t('mountPage.libraryEmpty', 'The Library is empty...')}
        </Typography>
        <Button
          onClick={onGoSearch}
          variant="text"
          sx={{ textTransform: 'none' }}
        >
          {t('mountPage.goSearch', 'Go search')}
        </Button>
        <Typography variant="body2" fontSize="small" color="textSecondary">
          {t('mountPage.or', 'or')}
        </Typography>
        <Button
          onClick={onImport}
          variant="text"
          sx={{ textTransform: 'none' }}
        >
          {t('mountPage.importDanmaku', 'Import danmaku (or drag and drop)')}
        </Button>
      </Stack>
      <SuspenseImage
        sx={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
        src={IMAGE_ASSETS.DrawCircle}
        height={300}
        cache={false}
      />
    </Box>
  )
}
