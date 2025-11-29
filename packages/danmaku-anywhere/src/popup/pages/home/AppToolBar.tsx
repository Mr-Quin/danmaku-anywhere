import { OpenInNew, Settings } from '@mui/icons-material'
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

import { useAnyLoading } from '@/common/hooks/useAnyLoading'
import { usePlatformInfo } from '@/common/hooks/usePlatformInfo'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { ThemeToggle } from '@/popup/component/ThemeToggle'
import { EnableExtensionToggle } from './EnableExtensionToggle'

export const AppToolBar = () => {
  const navigate = useNavigate()
  const isAnyLoading = useAnyLoading()
  const { isMobile } = usePlatformInfo()

  const { t } = useTranslation()

  const openInWindow = async () => {
    void chromeRpcClient.openPopupInNewWindow('')
  }

  return (
    <AppBar position="static">
      <Toolbar>
        <Fade in={isAnyLoading} unmountOnExit>
          <Box position="absolute" top={0} left={0} width={1}>
            <LinearProgress sx={{ height: '1px' }} />
          </Box>
        </Fade>
        <Typography variant="h1" fontSize={20} sx={{ flexGrow: 1 }}>
          {t('common.danmakuAnywhere')}
        </Typography>
        <EnableExtensionToggle />
        <ThemeToggle />
        <IconButton
          onClick={() => {
            navigate('/options')
          }}
          edge={isMobile ? 'end' : undefined}
          sx={{
            color: 'inherit',
          }}
        >
          <Settings />
        </IconButton>
        {!isMobile && (
          <IconButton
            onClick={openInWindow}
            edge="end"
            sx={{
              color: 'inherit',
            }}
          >
            <OpenInNew />
          </IconButton>
        )}
      </Toolbar>
    </AppBar>
  )
}
