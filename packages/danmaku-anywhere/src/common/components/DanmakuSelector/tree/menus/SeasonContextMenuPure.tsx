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
import { isCustomSeason } from '@/common/danmaku/utils'
import {
  NO_CAPABILITIES,
  type SourceCapabilityAnswer,
} from '@/common/providers/sourceCapabilities'

export interface SeasonContextMenuPureProps {
  season: Season | CustomSeason
  onExport: () => void
  onExportBackup: () => void
  onDelete: () => void
  onRefresh: () => void
  isRefreshing: boolean
  isExporting: boolean
  source?: SourceCapabilityAnswer
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
  source,
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

  if (!isCustomSeason(season)) {
    const sourceRemoved = source?.sourceRemoved === true
    const capabilities = source?.capabilities ?? NO_CAPABILITIES

    // A removed source keeps its actions in view, disabled, so the user sees
    // why they stopped working.
    const gate = (capable: boolean) => {
      if (sourceRemoved) {
        return {
          disabled: true,
          tooltip: t(
            'anime.sourceRemovedTooltip',
            'This source has been deleted.'
          ),
        }
      }
      if (capable) {
        return {}
      }
      return null
    }

    const refreshGate = gate(capabilities.seasonRefresh)
    const episodesGate = gate(capabilities.episodes)

    if (refreshGate) {
      items.unshift({
        kind: 'item',
        id: 'refresh',
        label: t('anime.refreshMetadata', 'Refresh Metadata'),
        icon: <Sync />,
        onClick: onRefresh,
        loading: isRefreshing,
        ...refreshGate,
      })
    }

    if (bookmarked) {
      items.unshift({
        kind: 'item',
        id: 'bookmarkRemove',
        label: t('bookmark.unfollow', 'Unfollow'),
        icon: <Favorite fontSize="small" />,
        onClick: onBookmarkToggle,
        loading: isBookmarkLoading,
      })
      if (episodesGate) {
        items.unshift({
          kind: 'item',
          id: 'bookmarkRefresh',
          label: t('bookmark.refreshEpisodes', 'Refresh Episodes'),
          icon: <Sync fontSize="small" />,
          onClick: onBookmarkRefresh,
          loading: isBookmarkLoading,
          ...episodesGate,
        })
      }
    } else if (episodesGate) {
      items.unshift({
        kind: 'item',
        id: 'bookmarkAdd',
        label: t('bookmark.add', 'Follow'),
        icon: <FavoriteBorder fontSize="small" />,
        onClick: onBookmarkToggle,
        loading: isBookmarkLoading,
        ...episodesGate,
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
