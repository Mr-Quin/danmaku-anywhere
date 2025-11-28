import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import { Delete, Download, Sync } from '@mui/icons-material'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DrilldownMenu,
  type DrilldownMenuItemProps,
} from '@/common/components/DrilldownMenu'
import { isNotCustom } from '@/common/danmaku/utils'

export interface SeasonContextMenuPureProps {
  season: Season | CustomSeason
  onExport: () => void
  onDelete: () => void
  onRefresh: () => void
  isRefreshing: boolean
  isExporting: boolean
}

export const SeasonContextMenuPure = ({
  season,
  onExport,
  onDelete,
  onRefresh,
  isRefreshing,
  isExporting,
}: SeasonContextMenuPureProps): ReactElement => {
  const { t } = useTranslation()

  const items: DrilldownMenuItemProps[] = [
    {
      kind: 'item',
      id: 'export',
      label: t('danmaku.exportXml'),
      icon: <Download fontSize="small" />,
      onClick: onExport,
      loading: isExporting,
    },
    { kind: 'separator', id: 'sep1' },
    {
      kind: 'item',
      id: 'delete',
      label: t('common.delete'),
      icon: <Delete fontSize="small" />,
      color: 'error',
      onClick: onDelete,
    },
  ]

  if (isNotCustom(season)) {
    items.unshift({
      kind: 'item',
      id: 'refresh',
      label: t('anime.refreshMetadata'),
      icon: <Sync />,
      onClick: onRefresh,
      loading: isRefreshing,
    })
  }

  return <DrilldownMenu items={items} ButtonProps={{ size: 'small' }} dense />
}
