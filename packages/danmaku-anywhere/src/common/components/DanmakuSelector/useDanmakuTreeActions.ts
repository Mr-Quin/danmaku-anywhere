import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeleteSeason } from '@/common/anime/queries/useDeleteSeason'
import type { DanmakuTreeApi } from '@/common/components/DanmakuSelector/tree/DanmakuTree'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { useDeleteEpisode } from '@/common/danmaku/queries/useDeleteEpisode'
import { isNotCustom } from '@/common/danmaku/utils'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'
import { useExportXml } from '@/popup/hooks/useExportXml'

interface UseDanmakuTreeActionsProps {
  treeRef: RefObject<DanmakuTreeApi | null>
  onMount: (episodes: GenericEpisodeLite[]) => void
  onToggleMultiselect: () => void
}

export const useDanmakuTreeActions = ({
  treeRef,
  onMount,
  onToggleMultiselect,
}: UseDanmakuTreeActionsProps) => {
  const { t } = useTranslation()
  const dialog = useDialog()
  const exportXmlMutation = useExportXml()
  const exportBackupMutation = useExportDanmaku()
  const deleteEpisodeMutation = useDeleteEpisode()
  const deleteSeasonMutation = useDeleteSeason()

  const getSelection = () => {
    return (
      treeRef.current?.getSelectedEpisodes() || {
        allEpisodes: [],
        episodes: [],
        customEpisodes: [],
        seasons: [],
      }
    )
  }

  const handleMountMultiple = () => {
    const { allEpisodes } = getSelection()
    if (allEpisodes.length === 0) return

    onMount(allEpisodes)
    treeRef.current?.clearSelection()
    onToggleMultiselect()
  }

  const handleExport = () => {
    const { allEpisodes } = getSelection()
    exportXmlMutation.mutate({
      filter: {
        ids: allEpisodes.filter((ep) => isNotCustom(ep)).map((ep) => ep.id),
      },
      customFilter: {
        ids: allEpisodes.filter((ep) => !isNotCustom(ep)).map((ep) => ep.id),
      },
    })
  }

  const handleExportBackup = () => {
    const { allEpisodes } = getSelection()
    exportBackupMutation.mutate({
      filter: {
        ids: allEpisodes.filter((ep) => isNotCustom(ep)).map((ep) => ep.id),
      },
      customFilter: {
        ids: allEpisodes.filter((ep) => !isNotCustom(ep)).map((ep) => ep.id),
      },
    })
  }

  const handleDelete = () => {
    const { episodes, customEpisodes, seasons } = getSelection()

    if (
      episodes.length === 0 &&
      customEpisodes.length === 0 &&
      seasons.length === 0
    ) {
      return
    }

    dialog.delete({
      title: t('common.confirmDeleteTitle', 'Confirm delete'),
      content: t(
        'mountPage.confirmDeleteMultiple',
        'Are you sure you want to delete {{count}} items?',
        {
          count: episodes.length + customEpisodes.length + seasons.length,
        }
      ),
      onConfirm: async () => {
        if (seasons.length > 0) {
          await Promise.all(
            seasons.map((s) => deleteSeasonMutation.mutateAsync(s.id))
          )
        }
        if (episodes.length > 0) {
          await deleteEpisodeMutation.mutateAsync({
            isCustom: false,
            filter: { ids: episodes.map((ep) => ep.id) },
          })
        }
        if (customEpisodes.length > 0) {
          await deleteEpisodeMutation.mutateAsync({
            isCustom: true,
            filter: { ids: customEpisodes.map((ep) => ep.id) },
          })
        }
        treeRef.current?.clearSelection()
      },
      confirmText: t('common.delete', 'Delete'),
    })
  }

  return {
    handleMountMultiple,
    handleExport,
    handleExportBackup,
    handleDelete,
  }
}
