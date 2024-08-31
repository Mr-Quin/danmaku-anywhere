import { Warning } from '@mui/icons-material'
import {
  CircularProgress,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material'
import { Trans } from 'react-i18next'

import { ExternalLink } from '@/common/components/ExternalLink'
import { useToggleBilibili } from '@/popup/pages/options/pages/danmakuSource/hooks/useToggleBilibili'

interface BilibiliListItemProps {
  enabled: boolean
  disableToggle: boolean
  onClick: () => void
  text: string
}

export const BilibiliListItem = ({
  enabled,
  disableToggle,
  onClick,
  text,
}: BilibiliListItemProps) => {
  const {
    toggle: toggleBilibili,
    isLoading: isBilibiliLoading,
    loginStatus,
  } = useToggleBilibili()

  const notLoggedIn = loginStatus?.isLogin === false

  return (
    <ListItem
      secondaryAction={
        isBilibiliLoading ? (
          <CircularProgress size={24} />
        ) : (
          <Switch
            checked={enabled}
            onChange={(e) => {
              toggleBilibili(e.target.checked)
            }}
            disabled={disableToggle || isBilibiliLoading}
          />
        )
      }
      disablePadding
    >
      <ListItemButton onClick={onClick}>
        <ListItemText primary={text} />
        {notLoggedIn && (
          <ListItemIcon>
            <Tooltip
              PopperProps={{
                // prevent clicks being propagated to the parent
                onMouseDown(e) {
                  e.stopPropagation()
                },
                onClick(e) {
                  e.stopPropagation()
                },
              }}
              title={
                <>
                  <Typography variant="subtitle2">
                    {/* @ts-ignore */}
                    <Trans i18nKey="danmakuSource.tooltip.bilibiliNotLoggedIn">
                      <ExternalLink
                        color="primary"
                        to="https://www.bilibili.com"
                        target="_blank"
                        rel="noreferrer"
                      />
                    </Trans>
                  </Typography>
                </>
              }
            >
              <Warning color="warning" />
            </Tooltip>
          </ListItemIcon>
        )}
      </ListItemButton>
    </ListItem>
  )
}
