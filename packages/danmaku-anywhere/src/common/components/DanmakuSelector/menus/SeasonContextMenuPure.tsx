import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import { Delete, Download, MoreVert } from '@mui/icons-material'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DrilldownMenu,
  type DrilldownMenuItemProps,
} from '@/content/common/DrilldownMenu'

export interface SeasonContextMenuPureProps {
  season: Season | CustomSeason
  onExport: () => void
  onDelete: () => void
}

export const SeasonContextMenuPure = ({
  season,
  onExport,
  onDelete,
}: SeasonContextMenuPureProps): ReactElement => {
  const { t } = useTranslation()

  const items: DrilldownMenuItemProps[] = [
    {
      kind: 'item',
      id: 'export',
      label: t('danmaku.exportAll'),
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
