import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import type { RefObject } from 'react'
import { useDeleteSeason } from '@/common/anime/queries/useDeleteSeason'
import type { DanmakuTreeApi } from '@/common/components/DanmakuSelector/tree/DanmakuTree'
import { useDeleteEpisode } from '@/common/danmaku/queries/useDeleteEpisode'
import { isNotCustom } from '@/common/danmaku/utils'
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
  const exportXmlMutation = useExportXml()
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

  const handleDelete = async () => {
    const { episodes, customEpisodes, seasons } = getSelection()

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
  }

  return {
    handleMountMultiple,
    handleExport,
    handleDelete,
  }
}
