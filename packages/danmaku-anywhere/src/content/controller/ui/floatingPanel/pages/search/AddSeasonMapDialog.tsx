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
    dialog.open({
      title: t('searchPage.titleMapping', 'Map Title'),
      content: t(
        'searchPage.titleMappingDialog.confirmation',
        'Map `{{original}}` to `{{mapped}}` ?',
        {
          original: mapKey,
          mapped: season.title,
        }
      ),
      cancelText: t(
        'searchPage.titleMappingDialog.searchOnly',
        'No, just search'
      ),
      confirmText: t('common.confirm', 'Confirm'),
      onCancel: () => {
        onProceed(season)
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
