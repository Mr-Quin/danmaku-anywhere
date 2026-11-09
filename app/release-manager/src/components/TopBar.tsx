import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import RefreshIcon from '@mui/icons-material/Refresh'
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import type { Build } from '../builds.js'
import { formatDay } from '../format.js'

interface TopBarProps {
  active?: Build
  activePath?: string
  reloadNeeded: boolean
  appUpdateVersion?: string
  appUpdateBusy: boolean
  onOpenExtensions: () => void
  onInstallAppUpdate: () => void
  onDismissReload: () => void
  onShowFolder: () => void
  onError: (error: unknown) => void
}

export function TopBar({
  active,
  activePath,
  reloadNeeded,
  appUpdateVersion,
  appUpdateBusy,
  onOpenExtensions,
  onInstallAppUpdate,
  onDismissReload,
  onShowFolder,
  onError,
}: TopBarProps) {
  const [copied, setCopied] = useState(false)

  function copyPath() {
    if (!activePath) {
      return
    }
    navigator.clipboard
      .writeText(activePath)
      .then(() => {
        setCopied(true)
        setTimeout(() => {
          setCopied(false)
        }, 1500)
      })
      .catch(onError)
  }

  const date = active?.publishedAt ?? active?.downloadedAt

  return (
    <Box
      sx={{
        px: 2,
        pt: 1.5,
        pb: 2,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flexShrink: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary">
            Active build
          </Typography>
          {active ? (
            <Typography variant="h2" component="div" noWrap>
              {active.title}{' '}
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
              >
                {active.version}
                {date ? ` · ${formatDay(date)}` : ''}
              </Typography>
            </Typography>
          ) : (
            <Typography variant="body1" color="text.secondary">
              None yet. Pick a build and choose Get and use.
            </Typography>
          )}
        </Box>
        {appUpdateVersion ? (
          <Button
            size="small"
            color="success"
            startIcon={<SystemUpdateAltIcon />}
            loading={appUpdateBusy}
            onClick={onInstallAppUpdate}
          >
            Update app to {appUpdateVersion}
          </Button>
        ) : null}
        <Button
          variant="outlined"
          startIcon={<OpenInNewIcon />}
          onClick={onOpenExtensions}
        >
          Open extensions page
        </Button>
      </Box>
      {activePath ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
          <ButtonBase
            onClick={copyPath}
            title="Copy folder path"
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 1,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              justifyContent: 'flex-start',
              '&:hover': { borderColor: 'text.secondary' },
            }}
          >
            <FolderOutlinedIcon fontSize="small" color="action" />
            <Typography
              variant="body2"
              noWrap
              sx={{ flex: 1, fontFamily: 'monospace', textAlign: 'left' }}
            >
              {activePath}
            </Typography>
            <Typography
              variant="caption"
              color="primary"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              {copied ? (
                <CheckIcon fontSize="inherit" />
              ) : (
                <ContentCopyIcon fontSize="inherit" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Typography>
          </ButtonBase>
          <Button variant="outlined" onClick={onShowFolder}>
            Show folder
          </Button>
        </Box>
      ) : null}
      {reloadNeeded ? (
        <Alert
          severity="warning"
          icon={<RefreshIcon />}
          onClose={onDismissReload}
          sx={{ mt: 1.5 }}
        >
          Switched. Press reload on Danmaku Anywhere in the extensions page to
          run it. First time: turn on Developer mode, click Load unpacked and
          pick the folder above.
        </Alert>
      ) : null}
    </Box>
  )
}
