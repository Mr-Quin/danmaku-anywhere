import { Settings } from '@mui/icons-material'
import {
  Box,
  Fade,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { StyledEnableSwitch } from '@/common/components/StyledEnableSwitch'
import { episodeToString } from '@/common/danmaku/utils'
import { useAnyLoading } from '@/common/hooks/useAnyLoading'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { HasIntegration } from '@/content/controller/common/components/HasIntegration'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'
import { WindowToolbar } from '@/content/controller/ui/floatingPanel/layout/WindowToolbar'

export const ControllerToolbar = () => {
  const { t } = useTranslation()
  const isAnyLoading = useAnyLoading()
  const { toggleOpen, lock, toggleLock } = usePopup()
  const { toggleManualMode, isManual, episodes } = useStore.use.danmaku()
  const { isMobile } = usePlatformInfo()

  const episode = episodes?.length === 1 ? episodes[0] : undefined

  const openSettings = async () => {
    void chromeRpcClient.openPopupInNewWindow('options?from=content')
  }

  return (
    <WindowToolbar
      showLock
      isLocked={lock}
      onLock={toggleLock}
      onUnlock={toggleLock}
      onClose={() => toggleOpen(false)}
      additionalButtons={
        !isMobile && (
          <IconButton
            onClick={openSettings}
            sx={{
              color: 'inherit',
            }}
          >
            <Settings />
          </IconButton>
        )
      }
    >
      <>
        <Fade in={isAnyLoading} unmountOnExit>
          <Box position="absolute" top={0} left={0} width={1}>
            <LinearProgress sx={{ height: '1px' }} />
          </Box>
        </Fade>
        <HasIntegration
          fallback={
            episode && (
              <Typography noWrap title={episodeToString(episode)}>
                {episodeToString(episode)}
              </Typography>
            )
          }
        >
          {(config) => {
            return (
              <>
                <Typography
                  overflow="hidden"
                  textOverflow="ellipsis"
                  title={config.name}
                >
                  {config.name}
                </Typography>
                <FormControlLabel
                  control={
                    <StyledEnableSwitch
                      checked={!isManual}
                      onChange={() => toggleManualMode()}
                      size="small"
                    />
                  }
                  label={t('integration.autoMode', 'Auto Mode')}
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
