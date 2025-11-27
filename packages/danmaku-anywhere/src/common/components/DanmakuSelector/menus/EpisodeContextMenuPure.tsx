import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import {
  Delete,
  Download,
  MoreVert,
  PlayArrow,
  Sync,
  Visibility,
} from '@mui/icons-material'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DrilldownMenu,
  type DrilldownMenuItemProps,
} from '@/content/common/DrilldownMenu'

export interface EpisodeContextMenuPureProps {
  episode: GenericEpisodeLite
  canRefresh: boolean
  isRefreshing: boolean
  onMount: () => void
  onViewDanmaku: () => void
  onRefresh: () => void
  onExport: () => void
  onDelete: () => void
}

export const EpisodeContextMenuPure = ({
  episode,
  canRefresh,
  isRefreshing,
  onMount,
  onViewDanmaku,
  onRefresh,
  onExport,
  onDelete,
}: EpisodeContextMenuPureProps): ReactElement => {
  const { t } = useTranslation()

  const items: DrilldownMenuItemProps[] = [
    {
      kind: 'item',
      id: 'mount',
      label: t('danmaku.mount'),
      icon: <PlayArrow fontSize="small" />,
      onClick: onMount,
    },
    {
      kind: 'item',
      id: 'view',
      label: t('danmaku.viewDanmaku'),
      icon: <Visibility fontSize="small" />,
      onClick: onViewDanmaku,
    },
    ...(canRefresh
      ? ([
          {
            kind: 'item',
            id: 'refresh',
            label: t('danmaku.refresh'),
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
      label: t('danmaku.export'),
      icon: <Download fontSize="small" />,
      onClick: onExport,
    },
    { kind: 'separator', id: 'sep1' },
    {
      kind: 'item',
      id: 'delete',
      label: t('common.delete'),
      icon: <Delete fontSize="small" color="error" />,
      onClick: onDelete,
    },
  ]

  return (
    <DrilldownMenu
      items={items}
      ButtonProps={{ size: 'small' }}
      icon={<MoreVert fontSize="small" />}
    />
  )
}
