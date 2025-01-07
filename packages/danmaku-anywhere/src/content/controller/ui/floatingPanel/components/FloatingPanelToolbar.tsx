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
import { danmakuToString } from '@/common/danmaku/utils'
import { useAnyLoading } from '@/common/hooks/useAnyLoading'
import { HasIntegration } from '@/content/controller/common/components/HasIntegration'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'

export const FloatingPanelToolbar = () => {
  const { t } = useTranslation()
  const isAnyLoading = useAnyLoading()
  const { toggleOpen } = usePopup()
  const { toggleManualMode, isManual, danmakuLite } = useStore.use.danmaku()

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
            danmakuLite && (
              <Typography noWrap title={danmakuToString(danmakuLite)}>
                {danmakuToString(danmakuLite)}
              </Typography>
            )
          }
        >
          {(integrationPolicy) => {
            return (
              <>
                <Typography>{integrationPolicy.name}</Typography>
                <FormControlLabel
                  control={
                    <StyledEnableSwitch
                      checked={!isManual}
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
              </>
            )
          }}
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
