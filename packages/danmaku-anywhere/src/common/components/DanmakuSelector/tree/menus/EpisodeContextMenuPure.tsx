import { Delete, Download, Sync, Visibility } from '@mui/icons-material'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import type { DAMenuItemConfig } from '@/common/components/Menu/DAMenuItemConfig'
import { DrilldownContextMenu } from '@/common/components/Menu/DrilldownContextMenu'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'

export interface EpisodeContextMenuPureProps {
  canRefresh: boolean
  isRefreshing: boolean
  onViewDanmaku: () => void
  onRefresh: () => void
  onExport: () => void
  onExportBackup: () => void
  onDelete: () => void
  contextMenuPosition?: { top: number; left: number } | null
  onClose: () => void
}

export const EpisodeContextMenuPure = ({
  canRefresh,
  isRefreshing,
  onViewDanmaku,
  onRefresh,
  onExport,
  onExportBackup,
  onDelete,
  contextMenuPosition,
  onClose,
}: EpisodeContextMenuPureProps): ReactElement => {
  const { t } = useTranslation()

  const items: DAMenuItemConfig[] = [
    {
      kind: 'item',
      id: 'view',
      label: t('danmaku.viewDanmaku', 'View Danmaku'),
      icon: <Visibility fontSize="small" />,
      onClick: onViewDanmaku,
    },
    ...(canRefresh
      ? ([
          {
            kind: 'item',
            id: 'refresh',
            label: t('danmaku.refresh', 'Refresh Danmaku'),
            icon: <Sync fontSize="small" />,
            onClick: onRefresh,
            loading: isRefreshing,
            disabled: isRefreshing,
          },
        ] as DAMenuItemConfig[])
      : []),
    {
      kind: 'item',
      id: 'export',
      label: t('danmaku.exportXml', 'Export XML'),
      icon: <Download fontSize="small" />,
      onClick: onExport,
    },
    {
      kind: 'item',
      id: 'exportBackup',
      label: t('danmaku.exportBackup', 'Export Backup'),
      icon: <Download fontSize="small" />,
      onClick: onExportBackup,
    },
    { kind: 'separator', id: 'sep1' },
    {
      kind: 'item',
      id: 'delete',
      label: t('common.delete', 'Delete'),
      icon: <Delete fontSize="small" />,
      onClick: onDelete,
      color: 'error',
    },
  ]

  if (contextMenuPosition) {
    return (
      <DrilldownContextMenu
        items={items}
        anchorPosition={contextMenuPosition}
        open
        dense
        onClose={onClose}
      />
    )
  }

  return <DrilldownMenu items={items} ButtonProps={{ size: 'small' }} dense />
}
