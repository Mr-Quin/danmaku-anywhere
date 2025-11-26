import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import { Delete, Download, MoreVert } from '@mui/icons-material'
import { IconButton, ListItemIcon, Menu, MenuItem } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SeasonContextMenuProps {
  season: Season | CustomSeason
  onExport: () => void
  onDelete: () => void
}

export const SeasonContextMenu = ({
  season,
  onExport,
  onDelete,
}: SeasonContextMenuProps) => {
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

  // Only show menu if we can perform actions
  // We can probably always export and delete seasons (even custom ones?)

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
        <MenuItem onClick={() => handleAction(onExport)}>
          <ListItemIcon>
            <Download fontSize="small" />
          </ListItemIcon>
          {t('danmaku.exportAll')}
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
