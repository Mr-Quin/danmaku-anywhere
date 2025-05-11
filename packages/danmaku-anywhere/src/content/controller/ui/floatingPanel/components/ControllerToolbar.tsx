import {
  Box,
  Fade,
  FormControlLabel,
  LinearProgress,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { StyledEnableSwitch } from '@/common/components/StyledEnableSwitch'
import { episodeToString } from '@/common/danmaku/utils'
import { useAnyLoading } from '@/common/hooks/useAnyLoading'
import { HasIntegration } from '@/content/controller/common/components/HasIntegration'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'
import { WindowToolbar } from '@/content/controller/ui/floatingPanel/layout/WindowToolbar'

export const ControllerToolbar = () => {
  const { t } = useTranslation()
  const isAnyLoading = useAnyLoading()
  const { toggleOpen, lock, toggleLock } = usePopup()
  const { toggleManualMode, isManual, danmakuLite } = useStore.use.danmaku()

  return (
    <WindowToolbar
      showLock
      isLocked={lock}
      onLock={toggleLock}
      onUnlock={toggleLock}
      onClose={() => toggleOpen(false)}
    >
      <>
        <Fade in={isAnyLoading} unmountOnExit>
          <Box position="absolute" top={0} left={0} width={1}>
            <LinearProgress sx={{ height: '1px' }} />
          </Box>
        </Fade>
        <HasIntegration
          fallback={
            danmakuLite && (
              <Typography noWrap title={episodeToString(danmakuLite)}>
                {episodeToString(danmakuLite)}
              </Typography>
            )
          }
        >
          {(integrationPolicy) => {
            return (
              <>
                <Typography
                  overflow="hidden"
                  textOverflow="ellipsis"
                  title={integrationPolicy.name}
                >
                  {integrationPolicy.name}
                </Typography>
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
                  sx={{ m: 0, minWidth: 'max-content' }}
                />
              </>
            )
          }}
        </HasIntegration>
      </>
    </WindowToolbar>
  )
}
