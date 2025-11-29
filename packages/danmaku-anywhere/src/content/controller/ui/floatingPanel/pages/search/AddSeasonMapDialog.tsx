import type { Season } from '@danmaku-anywhere/danmaku-converter'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { useAddSeasonMap } from '@/content/controller/ui/floatingPanel/pages/search/useAddSeasonMap'

interface AddSeasonMapDialogProps {
  onProceed: (season: Season) => void
  season: Season
  mapKey: string
}

export const useShowAddSeasonMapDialog = () => {
  const { t } = useTranslation()
  const dialog = useDialog()
  const addSeasonMapMutation = useAddSeasonMap()

  return ({ onProceed, season, mapKey }: AddSeasonMapDialogProps) => {
    const dialogId = dialog.open({
      title: t('searchPage.titleMapping'),
      content: t('searchPage.titleMapping.confirmation', {
        original: mapKey,
        mapped: season.title,
      }),
      cancelText: t('searchPage.titleMapping.searchOnly'),
      confirmText: t('common.confirm'),
      onCancel: () => {
        onProceed(season)
        dialog.close(dialogId)
      },
      onConfirm: async () => {
        await addSeasonMapMutation.mutateAsync(
          SeasonMap.fromSeason(mapKey, season)
        )
        onProceed(season)
      },
    })
  }
}
