import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import { Delete, Download, Sync } from '@mui/icons-material'
import { ClickAwayListener } from '@mui/material'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import type { DAMenuItemConfig } from '@/common/components/Menu/DAMenuItemConfig'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import { DrilldownMenuList } from '@/common/components/Menu/DrilldownMenuList'
import { isNotCustom } from '@/common/danmaku/utils'

export interface SeasonContextMenuPureProps {
  season: Season | CustomSeason
  onExport: () => void
  onDelete: () => void
  onRefresh: () => void
  isRefreshing: boolean
  isExporting: boolean
  contextMenuPosition?: { top: number; left: number } | null
  onClose?: () => void
}

export const SeasonContextMenuPure = ({
  season,
  onExport,
  onDelete,
  onRefresh,
  isRefreshing,
  isExporting,
  contextMenuPosition,
  onClose,
}: SeasonContextMenuPureProps): ReactElement => {
  const { t } = useTranslation()

  const handleClose = () => {
    onClose?.()
  }

  const items: DAMenuItemConfig[] = [
    {
      kind: 'item',
      id: 'export',
      label: t('danmaku.exportXml', 'Export XML'),
      icon: <Download fontSize="small" />,
      onClick: onExport,
      loading: isExporting,
    },
    { kind: 'separator', id: 'sep1' },
    {
      kind: 'item',
      id: 'delete',
      label: t('common.delete', 'Delete'),
      icon: <Delete fontSize="small" />,
      color: 'error',
      onClick: onDelete,
    },
  ]

  if (isNotCustom(season)) {
    items.unshift({
      kind: 'item',
      id: 'refresh',
      label: t('anime.refreshMetadata', 'Refresh Metadata'),
      icon: <Sync />,
      onClick: onRefresh,
      loading: isRefreshing,
    })
  }

  if (contextMenuPosition) {
    return (
      <ClickAwayListener onClickAway={handleClose}>
        <DrilldownMenuList
          items={items}
          anchorPosition={contextMenuPosition}
          open
          dense
          onClose={handleClose}
          MenuProps={{
            disableAutoFocus: true,
            disableAutoFocusItem: true,
            disableEnforceFocus: true,
            disableRestoreFocus: true,
            autoFocus: false,
          }}
        />
      </ClickAwayListener>
    )
  }

  return <DrilldownMenu items={items} ButtonProps={{ size: 'small' }} dense />
}
