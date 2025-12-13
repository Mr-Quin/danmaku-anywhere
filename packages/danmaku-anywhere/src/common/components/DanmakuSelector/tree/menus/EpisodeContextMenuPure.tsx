import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { Delete, Download, Sync, Visibility } from '@mui/icons-material'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DrilldownMenu,
  type DrilldownMenuItemProps,
} from '@/common/components/DrilldownMenu'

export interface EpisodeContextMenuPureProps {
  episode: GenericEpisodeLite
  canRefresh: boolean
  isRefreshing: boolean
  onViewDanmaku: () => void
  onRefresh: () => void
  onExport: () => void
  onDelete: () => void
  contextMenuPosition?: { top: number; left: number } | null
  onClose?: () => void
}

export const EpisodeContextMenuPure = ({
  episode,
  canRefresh,
  isRefreshing,
  onViewDanmaku,
  onRefresh,
  onExport,
  onDelete,
  contextMenuPosition,
  onClose,
}: EpisodeContextMenuPureProps): ReactElement => {
  const { t } = useTranslation()

  const items: DrilldownMenuItemProps[] = [
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
        ] as DrilldownMenuItemProps[])
      : []),
    {
      kind: 'item',
      id: 'export',
      label: t('danmaku.exportXml', 'Export XML'),
      icon: <Download fontSize="small" />,
      onClick: onExport,
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

  return (
    <DrilldownMenu
      items={items}
      ButtonProps={{ size: 'small' }}
      dense
      contextMenuPosition={contextMenuPosition}
      onClose={onClose}
    />
  )
}
