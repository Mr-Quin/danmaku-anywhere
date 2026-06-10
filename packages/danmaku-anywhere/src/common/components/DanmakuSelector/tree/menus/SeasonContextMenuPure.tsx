import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import {
  Delete,
  Download,
  Favorite,
  FavoriteBorder,
  Sync,
} from '@mui/icons-material'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import type { DAMenuItemConfig } from '@/common/components/Menu/DAMenuItemConfig'
import { DrilldownContextMenu } from '@/common/components/Menu/DrilldownContextMenu'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import { isNotCustom } from '@/common/danmaku/utils'

export interface SeasonContextMenuPureProps {
  season: Season | CustomSeason
  onExport: () => void
  onExportBackup: () => void
  onDelete: () => void
  onRefresh: () => void
  isRefreshing: boolean
  isExporting: boolean
  orphaned?: boolean
  bookmarked: boolean
  onBookmarkToggle: () => void
  onBookmarkRefresh: () => void
  isBookmarkLoading: boolean
  contextMenuPosition?: { top: number; left: number } | null
  onClose: () => void
}

export const SeasonContextMenuPure = ({
  season,
  onExport,
  onExportBackup,
  onDelete,
  onRefresh,
  isRefreshing,
  isExporting,
  orphaned,
  bookmarked,
  onBookmarkToggle,
  onBookmarkRefresh,
  isBookmarkLoading,
  contextMenuPosition,
  onClose,
}: SeasonContextMenuPureProps): ReactElement => {
  const { t } = useTranslation()

  const items: DAMenuItemConfig[] = [
    {
      kind: 'item',
      id: 'export',
      label: t('danmaku.exportXml', 'Export XML'),
      icon: <Download fontSize="small" />,
      onClick: onExport,
      loading: isExporting,
    },
    {
      kind: 'item',
      id: 'exportBackup',
      label: t('danmaku.exportBackup', 'Export Backup'),
      icon: <Download fontSize="small" />,
      onClick: onExportBackup,
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
    const sourceRemovedTooltip = orphaned
      ? t('anime.sourceRemovedTooltip', 'This source has been deleted.')
      : undefined

    items.unshift({
      kind: 'item',
      id: 'refresh',
      label: t('anime.refreshMetadata', 'Refresh Metadata'),
      icon: <Sync />,
      onClick: onRefresh,
      loading: isRefreshing,
      disabled: orphaned,
      tooltip: sourceRemovedTooltip,
    })

    if (bookmarked) {
      items.unshift(
        {
          kind: 'item',
          id: 'bookmarkRefresh',
          label: t('bookmark.refreshEpisodes', 'Refresh Episodes'),
          icon: <Sync fontSize="small" />,
          onClick: onBookmarkRefresh,
          loading: isBookmarkLoading,
          disabled: orphaned,
          tooltip: sourceRemovedTooltip,
        },
        {
          kind: 'item',
          id: 'bookmarkRemove',
          label: t('bookmark.remove', 'Following'),
          icon: <Favorite fontSize="small" />,
          onClick: onBookmarkToggle,
          loading: isBookmarkLoading,
        }
      )
    } else {
      items.unshift({
        kind: 'item',
        id: 'bookmarkAdd',
        label: t('bookmark.add', 'Follow'),
        icon: <FavoriteBorder fontSize="small" />,
        onClick: onBookmarkToggle,
        loading: isBookmarkLoading,
        disabled: orphaned,
        tooltip: sourceRemovedTooltip,
      })
    }
  }

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
