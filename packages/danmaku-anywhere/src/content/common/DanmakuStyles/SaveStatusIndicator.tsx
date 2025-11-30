import { CheckCircle, Save, Sync } from '@mui/icons-material'
import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { SaveStatus } from './DanmakuStylesForm'

export type SaveStatusIndicatorProps = {
  status: SaveStatus
}

export const SaveStatusIndicator = ({ status }: SaveStatusIndicatorProps) => {
  const { t } = useTranslation()

  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: (
            <Sync sx={{ fontSize: 16, animation: 'spin 1s linear infinite' }} />
          ),
          text: t('common.saving', 'Saving...'),
          color: 'primary.main',
        }
      case 'saved':
        return {
          icon: <CheckCircle sx={{ fontSize: 16 }} />,
          text: t('common.saved', 'Saved'),
          color: 'success.main',
        }
      default:
        return {
          icon: <Save sx={{ fontSize: 16 }} />,
          text: t('common.autoSave', 'Auto-save'),
          color: 'text.secondary',
        }
    }
  }

  const { icon, text, color } = getStatusConfig()

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={0.5}
      sx={{
        '& .MuiSvgIcon-root': {
          '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' },
          },
        },
      }}
    >
      <Box
        component="span"
        sx={{ color, display: 'flex', alignItems: 'center' }}
      >
        {icon}
      </Box>
      <Typography variant="body2" sx={{ color }}>
        {text}
      </Typography>
    </Box>
  )
}
