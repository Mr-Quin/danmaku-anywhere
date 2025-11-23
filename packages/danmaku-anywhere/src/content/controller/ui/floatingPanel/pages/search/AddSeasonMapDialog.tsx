import type { Season } from '@danmaku-anywhere/danmaku-converter'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useAddSeasonMap } from '@/content/controller/ui/floatingPanel/pages/search/useAddSeasonMap'

interface AddSeasonMapDialogProps {
  open: boolean
  onClose: () => void
  onProceed: (season: Season) => void
  container: HTMLElement | null
  season: Season
  mapKey: string
}

export const AddSeasonMapDialog = ({
  open,
  onClose,
  onProceed,
  container,
  mapKey,
  season,
}: AddSeasonMapDialogProps) => {
  const { t } = useTranslation()

  const addSeasonMapMutation = useAddSeasonMap()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={false}
      container={container}
    >
      <DialogTitle>{t('searchPage.titleMapping')}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('searchPage.titleMapping.confirmation', {
            original: mapKey,
            mapped: season.title,
          })}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => onProceed(season)}
          disabled={addSeasonMapMutation.isPending}
        >
          {t('searchPage.titleMapping.searchOnly')}
        </Button>
        <Button
          variant="contained"
          onClick={() =>
            addSeasonMapMutation.mutate(
              {
                key: mapKey,
                seasons: {
                  [season.providerConfigId]: season.id,
                },
                seasonIds: [season.id],
              },
              {
                onSettled: () => {
                  onProceed(season)
                },
              }
            )
          }
          loading={addSeasonMapMutation.isPending}
        >
          {t('common.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
