import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeleteSeason } from '@/common/anime/queries/useDeleteSeason'
import { useRefreshSeason } from '@/common/anime/queries/useRefreshSeason'
import { useBookmarkAdd } from '@/common/bookmark/queries/useBookmarkAdd'
import { useBookmarkDeleteBySeason } from '@/common/bookmark/queries/useBookmarkDelete'
import { useBookmarkRefresh } from '@/common/bookmark/queries/useBookmarkRefresh'
import { useBookmarksSuspense } from '@/common/bookmark/queries/useBookmarks'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { useDeleteEpisode } from '@/common/danmaku/queries/useDeleteEpisode'
import { isNotCustom } from '@/common/danmaku/utils'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'
import { useExportXml } from '@/popup/hooks/useExportXml'
import { useDanmakuTreeContext } from '../DanmakuTreeContext'
import { SeasonContextMenuPure } from './SeasonContextMenuPure'

interface SeasonContextMenuContainerProps {
  season: Season | CustomSeason
  itemId: string
}

export const SeasonContextMenuContainer = ({
  season,
  itemId,
}: SeasonContextMenuContainerProps): ReactElement => {
  const { t } = useTranslation()
  const { contextMenu, setContextMenu } = useDanmakuTreeContext()
  const exportXml = useExportXml()
  const exportBackup = useExportDanmaku()
  const refreshSeason = useRefreshSeason()
  const deleteSeasonMutation = useDeleteSeason()
  const deleteEpisodeMutation = useDeleteEpisode()

  const { data: bookmarks } = useBookmarksSuspense()
  const bookmarkAdd = useBookmarkAdd()
  const bookmarkDeleteBySeason = useBookmarkDeleteBySeason()
  const bookmarkRefresh = useBookmarkRefresh()

  const bookmark = isNotCustom(season)
    ? bookmarks.find((b) => b.seasonId === season.id)
    : undefined
  const isBookmarked = !!bookmark

  const dialog = useDialog()

  const handleExport = () => {
    if (isNotCustom(season)) {
      exportXml.mutate({
        filter: { seasonId: season.id },
      })
    } else {
      exportXml.mutate({
        customFilter: { all: true },
      })
    }
  }

  const handleExportBackup = () => {
    if (isNotCustom(season)) {
      exportBackup.mutate({
        filter: { seasonId: season.id },
      })
    } else {
      exportBackup.mutate({
        customFilter: { all: true },
      })
    }
  }

  const handleDelete = () => {
    dialog.delete({
      title: t('common.confirmDeleteTitle', 'Confirm delete'),
      content: t(
        'danmakuPage.confirmDeleteMessage',
        'Are you sure to delete the selected Danmaku?'
      ),
      confirmText: t('common.delete', 'Delete'),
      onConfirm: async () => {
        if (isNotCustom(season)) {
          await deleteSeasonMutation.mutateAsync(season.id)
        } else {
          await deleteEpisodeMutation.mutateAsync({
            isCustom: true,
            filter: { all: true },
          })
        }
      },
    })
  }

  const handleBookmarkToggle = () => {
    if (isBookmarked) {
      bookmarkDeleteBySeason.mutate(season.id)
    } else if (isNotCustom(season)) {
      bookmarkAdd.mutate(season.id)
    }
  }

  const handleBookmarkRefresh = () => {
    if (bookmark) {
      bookmarkRefresh.mutate(bookmark.id)
    }
  }

  const isContextOpen = contextMenu?.itemId === itemId
  const contextPosition = isContextOpen ? contextMenu.position : undefined
  const handleClose = () => setContextMenu(null)

  return (
    <SeasonContextMenuPure
      season={season}
      onExport={handleExport}
      onExportBackup={handleExportBackup}
      isExporting={exportXml.isPending || exportBackup.isPending}
      onRefresh={() => refreshSeason.mutate(season.id)}
      isRefreshing={refreshSeason.isPending}
      bookmarked={isBookmarked}
      onBookmarkToggle={handleBookmarkToggle}
      onBookmarkRefresh={handleBookmarkRefresh}
      isBookmarkLoading={
        bookmarkAdd.isPending ||
        bookmarkDeleteBySeason.isPending ||
        bookmarkRefresh.isPending
      }
      onDelete={handleDelete}
      contextMenuPosition={contextPosition}
      onClose={handleClose}
    />
  )
}
