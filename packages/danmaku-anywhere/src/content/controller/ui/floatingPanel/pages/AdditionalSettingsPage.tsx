import { Settings as SettingsIcon } from '@mui/icons-material'
import { Box, Button, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'

export const AdditionalSettingsPage = () => {
  const { t } = useTranslation()
  const { isMobile } = usePlatformInfo()

  const handleOpenSettings = () => {
    const optionsUrl = chrome.runtime.getURL('pages/popup.html#/options')

    if (isMobile) {
      // On mobile, open in a new tab
      window.open(optionsUrl, '_blank')
    } else {
      // On desktop, open in a new window with specific dimensions
      window.open(
        optionsUrl,
        'optionsWindow',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )
    }
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
      p={3}
      gap={3}
    >
      <SettingsIcon
        sx={{
          fontSize: 64,
          color: 'text.secondary',
        }}
      />

      <Typography variant="h6" align="center" color="text.primary" gutterBottom>
        {t('tabs.additionalSettings')}
      </Typography>

      <Typography
        variant="body2"
        align="center"
        color="text.secondary"
        sx={{ maxWidth: 250 }}
        gutterBottom
      >
        {isMobile
          ? t(
              'additionalSettings.description.mobile',
              'Access additional settings and options in a new tab.'
            )
          : t(
              'additionalSettings.description.desktop',
              'Access additional settings and options in a new window.'
            )}
      </Typography>

      <Button
        variant="contained"
        size="large"
        startIcon={<SettingsIcon />}
        onClick={handleOpenSettings}
        sx={{ mt: 2 }}
      >
        {t('additionalSettings.button', 'Open Settings')}
      </Button>
    </Box>
  )
}
