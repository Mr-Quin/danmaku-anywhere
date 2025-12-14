import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { useDeleteEpisode } from '@/common/danmaku/queries/useDeleteEpisode'
import { useFetchDanmaku } from '@/common/danmaku/queries/useFetchDanmaku'
import { isNotCustom } from '@/common/danmaku/utils'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'
import { useExportXml } from '@/popup/hooks/useExportXml'
import { useDanmakuTreeContext } from '../DanmakuTreeContext'
import { EpisodeContextMenuPure } from './EpisodeContextMenuPure'

interface EpisodeContextMenuContainerProps {
  episode: GenericEpisodeLite
  itemId: string
}

export const EpisodeContextMenuContainer = ({
  episode,
  itemId,
}: EpisodeContextMenuContainerProps): ReactElement => {
  const { t } = useTranslation()
  const { mutateAsync: load, isPending } = useFetchDanmaku()
  const exportDanmaku = useExportXml()
  const exportBackup = useExportDanmaku()
  const deleteDanmakuMutation = useDeleteEpisode()
  const dialog = useDialog()

  const { setViewingDanmaku, contextMenu, setContextMenu } =
    useDanmakuTreeContext()

  const handleFetchDanmaku = async () => {
    if (!isNotCustom(episode)) return

    await load({
      type: 'by-meta',
      meta: episode,
      options: {
        forceUpdate: true,
      },
    })
  }

  const handleExport = () => {
    if (isNotCustom(episode)) {
      exportDanmaku.mutate({
        filter: { ids: [episode.id] },
      })
    } else {
      exportDanmaku.mutate({
        customFilter: { ids: [episode.id] },
      })
    }
  }

  const handleExportBackup = () => {
    if (isNotCustom(episode)) {
      exportBackup.mutate({
        filter: { ids: [episode.id] },
      })
    } else {
      exportBackup.mutate({
        customFilter: { ids: [episode.id] },
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
        if (isNotCustom(episode)) {
          await deleteDanmakuMutation.mutateAsync({
            isCustom: false,
            filter: { ids: [episode.id] },
          })
        } else {
          await deleteDanmakuMutation.mutateAsync({
            isCustom: true,
            filter: { ids: [episode.id] },
          })
        }
      },
    })
  }

  const isContextOpen = contextMenu?.itemId === itemId
  const contextPosition = isContextOpen ? contextMenu.position : undefined
  const handleClose = () => setContextMenu(null)

  return (
    <EpisodeContextMenuPure
      canRefresh={isNotCustom(episode)}
      isRefreshing={isPending}
      onViewDanmaku={() => setViewingDanmaku(episode)}
      onRefresh={handleFetchDanmaku}
      onExport={handleExport}
      onExportBackup={handleExportBackup}
      onDelete={handleDelete}
      contextMenuPosition={contextPosition}
      onClose={handleClose}
    />
  )
}
