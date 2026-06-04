import { FileUpload } from '@mui/icons-material'
import { Box, Button, CircularProgress, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ButtonSettingConfig } from '@/common/settings/settingConfigs'

interface DeclarativeButtonSettingProps {
  config: ButtonSettingConfig
  isLoading?: boolean
}

export const DeclarativeButtonSetting = ({
  config,
  isLoading: isLoadingProp,
}: DeclarativeButtonSettingProps) => {
  const { t } = useTranslation()
  const [isLoadingState, setIsLoading] = useState(false)

  async function handleClick() {
    setIsLoading(true)
    try {
      await config.handler()
    } finally {
      setIsLoading(false)
    }
  }

  const isLoading = isLoadingState || isLoadingProp

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.75,
        py: 1.25,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {config.label()}
        </Typography>
        {config.description && (
          <Typography
            variant="caption"
            sx={{ display: 'block', color: 'text.secondary', mt: 0.25 }}
          >
            {config.description()}
          </Typography>
        )}
      </Box>
      <Button
        variant="soft"
        onClick={handleClick}
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={14} /> : <FileUpload />}
      >
        {t('optionsPage.submit', 'Submit')}
      </Button>
    </Box>
  )
}
