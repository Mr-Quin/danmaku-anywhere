import type { CustomSeason, Season } from '@danmaku-anywhere/danmaku-converter'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeleteSeason } from '@/common/anime/queries/useDeleteSeason'
import { useRefreshSeason } from '@/common/anime/queries/useRefreshSeason'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { isNotCustom } from '@/common/danmaku/utils'
import { useExportXml } from '@/popup/hooks/useExportXml'
import { SeasonContextMenuPure } from './SeasonContextMenuPure'

interface SeasonContextMenuContainerProps {
  season: Season | CustomSeason
}

export const SeasonContextMenuContainer = ({
  season,
}: SeasonContextMenuContainerProps): ReactElement => {
  const { t } = useTranslation()
  const exportXml = useExportXml()
  const refreshSeason = useRefreshSeason()
  const deleteSeasonMutation = useDeleteSeason()
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
    if (isNotCustom(season)) {
      return
    }

    dialog.delete({
      title: t('common.confirmDeleteTitle'),
      content: t('danmakuPage.confirmDeleteMessage'),
      confirmText: t('common.delete'),
      onConfirm: async () => {
        await deleteSeasonMutation.mutateAsync(season.id)
      },
    })
  }

  return (
    <SeasonContextMenuPure
      season={season}
      onExport={handleExport}
      isExporting={exportXml.isPending}
      onRefresh={() => refreshSeason.mutate(season.id)}
      isRefreshing={refreshSeason.isPending}
      onDelete={handleDelete}
    />
  )
}
