import { Close } from '@mui/icons-material'
import {
  AppBar,
  FormControlLabel,
  IconButton,
  Switch,
  Toolbar,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { getIntegrationLabel } from '@/common/danmaku/types/enums'
import { HasIntegration } from '@/content/common/components/HasIntegration'
import { usePopup } from '@/content/store/popupStore'
import { useStore } from '@/content/store/store'

export const FloatingPanelToolbar = () => {
  const { t } = useTranslation()
  const { toggleOpen } = usePopup()
  const { toggleManualMode, manual, integration } = useStore()

  return (
    <AppBar position="relative">
      <Toolbar variant="dense" sx={{ gap: 2 }}>
        <HasIntegration>
          <Typography>{getIntegrationLabel(integration)}</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={!manual}
                onChange={() => toggleManualMode()}
                size="small"
              />
            }
            label={t('integration.autoMode')}
            labelPlacement="top"
            slotProps={{
              typography: {
                variant: 'caption',
              },
            }}
            sx={{ m: 0 }}
          />
        </HasIntegration>
        <IconButton
          edge="end"
          onClick={() => toggleOpen(false)}
          sx={{ ml: 'auto' }}
        >
          <Close />
        </IconButton>
      </Toolbar>
    </AppBar>
  )
}
