import { Close } from '@mui/icons-material'
import {
  AppBar,
  Box,
  Fade,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Toolbar,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { StyledEnableSwitch } from '@/common/components/StyledEnableSwitch'
import { getIntegrationLabel } from '@/common/danmaku/types/enums'
import { danmakuMetaToString } from '@/common/danmaku/utils'
import { useAnyLoading } from '@/common/hooks/useAnyLoading'
import { HasIntegration } from '@/content/common/components/HasIntegration'
import { usePopup } from '@/content/store/popupStore'
import { useStore } from '@/content/store/store'

export const FloatingPanelToolbar = () => {
  const { t } = useTranslation()
  const isAnyLoading = useAnyLoading()
  const { toggleOpen } = usePopup()
  const { toggleManualMode, manual, integration, danmakuMeta } = useStore()

  return (
    <AppBar position="relative">
      <Toolbar variant="dense" sx={{ gap: 2 }}>
        <Fade in={isAnyLoading} unmountOnExit>
          <Box position="absolute" top={0} left={0} width={1}>
            <LinearProgress sx={{ height: '1px' }} />
          </Box>
        </Fade>
        <HasIntegration
          fallback={
            danmakuMeta && (
              <Typography noWrap title={danmakuMetaToString(danmakuMeta)}>
                {danmakuMetaToString(danmakuMeta)}
              </Typography>
            )
          }
        >
          <Typography>{getIntegrationLabel(integration)}</Typography>
          <FormControlLabel
            control={
              <StyledEnableSwitch
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
