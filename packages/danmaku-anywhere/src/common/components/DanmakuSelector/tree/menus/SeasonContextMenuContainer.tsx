import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeleteSeason } from '@/common/anime/queries/useDeleteSeason'
import { useRefreshSeason } from '@/common/anime/queries/useRefreshSeason'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { useDeleteEpisode } from '@/common/danmaku/queries/useDeleteEpisode'
import { isNotCustom } from '@/common/danmaku/utils'
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
  const refreshSeason = useRefreshSeason()
  const deleteSeasonMutation = useDeleteSeason()
  const deleteEpisodeMutation = useDeleteEpisode()

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

  const isContextOpen = contextMenu?.itemId === itemId
  const contextPosition = isContextOpen ? contextMenu.position : undefined
  const handleClose = () => setContextMenu(null)

  return (
    <SeasonContextMenuPure
      season={season}
      onExport={handleExport}
      isExporting={exportXml.isPending}
      onRefresh={() => refreshSeason.mutate(season.id)}
      isRefreshing={refreshSeason.isPending}
      onDelete={handleDelete}
      contextMenuPosition={contextPosition}
      onClose={handleClose}
    />
  )
}
