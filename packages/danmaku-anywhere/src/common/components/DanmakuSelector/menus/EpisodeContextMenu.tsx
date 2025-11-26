import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import {
  Delete,
  Download,
  MoreVert,
  PlayArrow,
  Sync,
  Visibility,
} from '@mui/icons-material'
import { IconButton, ListItemIcon, Menu, MenuItem } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isNotCustom } from '@/common/danmaku/utils'

interface EpisodeContextMenuProps {
  episode: GenericEpisodeLite
  onMount: () => void
  onViewDanmaku: () => void
  onRefresh: () => void
  onExport: () => void
  onDelete: () => void
  isRefreshing: boolean
}

export const EpisodeContextMenu = ({
  episode,
  onMount,
  onViewDanmaku,
  onRefresh,
  onExport,
  onDelete,
  isRefreshing,
}: EpisodeContextMenuProps) => {
  const { t } = useTranslation()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleAction = (action: () => void) => {
    handleClose()
    action()
  }

  const canRefresh = isNotCustom(episode)

  return (
    <>
      <IconButton size="small" onClick={handleClick}>
        <MoreVert fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={() => handleAction(onMount)}>
          <ListItemIcon>
            <PlayArrow fontSize="small" />
          </ListItemIcon>
          {t('danmaku.mount')}
        </MenuItem>
        <MenuItem onClick={() => handleAction(onViewDanmaku)}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          {t('danmaku.viewDanmaku')}
        </MenuItem>
        {canRefresh && (
          <MenuItem
            onClick={() => handleAction(onRefresh)}
            disabled={isRefreshing}
          >
            <ListItemIcon>
              <Sync fontSize="small" />
            </ListItemIcon>
            {t('danmaku.refresh')}
          </MenuItem>
        )}
        <MenuItem onClick={() => handleAction(onExport)}>
          <ListItemIcon>
            <Download fontSize="small" />
          </ListItemIcon>
          {t('danmaku.export')}
        </MenuItem>
        <MenuItem onClick={() => handleAction(onDelete)}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          {t('common.delete')}
        </MenuItem>
      </Menu>
    </>
  )
}
