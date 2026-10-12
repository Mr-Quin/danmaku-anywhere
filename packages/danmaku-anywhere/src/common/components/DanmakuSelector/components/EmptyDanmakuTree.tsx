import { Box, Button, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { SuspenseImage } from '@/common/components/image/SuspenseImage'

import { IMAGE_ASSETS } from '@/images/ImageAssets'

interface EmptyDanmakuTreeProps {
  onImport: () => void
  onGoSearch: () => void
  showMountHint?: boolean
}

export const EmptyDanmakuTree = ({
  onImport,
  onGoSearch,
  showMountHint = false,
}: EmptyDanmakuTreeProps) => {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        height: 1,
        position: 'relative',
      }}
    >
      <Stack
        sx={{
          p: 4,
          alignItems: 'center',
          zIndex: 2,
          position: 'relative',
        }}
      >
        <Typography
          sx={{
            mb: 2,
          }}
        >
          {t('mountPage.libraryEmpty', 'The library is empty…')}
        </Typography>
        <Button
          onClick={onGoSearch}
          variant="text"
          sx={{ textTransform: 'none' }}
        >
          {t('mountPage.goSearch', 'Go search')}
        </Button>
        <Typography
          variant="body2"
          color="textSecondary"
          sx={{
            fontSize: 'small',
          }}
        >
          {t('mountPage.or', 'or')}
        </Typography>
        <Button
          onClick={onImport}
          variant="text"
          sx={{ textTransform: 'none' }}
        >
          {t('mountPage.importDanmaku', 'Import danmaku (or drag and drop)')}
        </Button>
        {showMountHint && (
          <Typography
            variant="body2"
            data-testid="library-mount-hint"
            sx={{ mt: 2, color: 'text.secondary', textAlign: 'center' }}
          >
            {t(
              'mountPage.emptyMountHint',
              'Search for the show, download an episode, then click it to mount it on this video.'
            )}
          </Typography>
        )}
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
      />
    </Box>
  )
}
