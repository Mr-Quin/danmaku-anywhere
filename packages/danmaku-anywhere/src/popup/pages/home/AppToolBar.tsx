import { OpenInNew, Settings, Tab } from '@mui/icons-material'
import {
  AppBar,
  Box,
  Fade,
  IconButton,
  LinearProgress,
  Toolbar,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import { useAnyLoading } from '@/common/hooks/useAnyLoading'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { TOOLBAR_MIN_HEIGHT } from '@/common/theme/sakura'
import { ThemeToggle } from '@/popup/component/ThemeToggle'
import { EnableExtensionToggle } from './EnableExtensionToggle'

export const AppToolBar = () => {
  const navigate = useNavigate()
  const isAnyLoading = useAnyLoading()
  const { isMobile } = usePlatformInfo()

  const { t } = useTranslation()

  const openInWindow = () => {
    void chromeRpcClient.openPopupInNewWindow({ path: '' })
  }

  const openInTab = () => {
    void chromeRpcClient.openPopupInNewTab({ path: '' })
  }

  return (
    <AppBar position="static">
      <Toolbar variant="dense" sx={{ minHeight: TOOLBAR_MIN_HEIGHT }}>
        <Fade in={isAnyLoading} unmountOnExit>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 1,
            }}
          >
            <LinearProgress sx={{ height: '1px' }} />
          </Box>
        </Fade>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          {t('common.danmakuAnywhere', 'Danmaku Anywhere')}
        </Typography>
        <EnableExtensionToggle />
        <ThemeToggle />
        <IconButton
          onClick={() => {
            navigate('/options')
          }}
          sx={{
            color: 'inherit',
          }}
        >
          <Settings />
        </IconButton>
        {isMobile ? (
          <IconButton
            onClick={openInTab}
            edge="end"
            aria-label={t('common.openInNewTab', 'Open in new tab')}
            data-testid="open-in-tab-button"
            sx={{
              color: 'inherit',
            }}
          >
            <Tab />
          </IconButton>
        ) : (
          <DrilldownMenu
            icon={<OpenInNew />}
            buttonTestId="open-in-new-button"
            ButtonProps={{ edge: 'end', sx: { color: 'inherit' } }}
            items={[
              {
                id: 'open-in-window',
                label: t('common.openInNewWindow', 'Open in new window'),
                icon: <OpenInNew />,
                onClick: openInWindow,
              },
              {
                id: 'open-in-tab',
                label: t('common.openInNewTab', 'Open in new tab'),
                icon: <Tab />,
                onClick: openInTab,
              },
            ]}
          />
        )}
      </Toolbar>
    </AppBar>
  )
}
