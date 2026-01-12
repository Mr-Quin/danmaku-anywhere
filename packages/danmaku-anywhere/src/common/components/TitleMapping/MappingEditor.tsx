import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import { useProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { useSeasonMapMutations } from '@/common/seasonMap/queries/useAllSeasonMap'
import type { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { SeasonSearchForm } from './SeasonSearchForm'

type MappingEditorProps = {
  open: boolean
  onClose: () => void
  map: SeasonMap
  initialProviderId?: string
}

export const MappingEditor = ({
  open,
  onClose,
  map,
  initialProviderId,
}: MappingEditorProps) => {
  const { t } = useTranslation()
  const { configs } = useProviderConfig()
  const mutations = useSeasonMapMutations()

  const [providerId, setProviderId] = useState<string>(initialProviderId || '')
  const [seasonId, setSeasonId] = useState<number | null>(null)
  const [seasonTitle, setSeasonTitle] = useState<string>('')

  const handleSave = async () => {
    if (!providerId || !seasonId) return

    await mutations.add.mutateAsync(map.withMapping(providerId, seasonId))
    onClose()
  }

  // Filter out providers that are already mapped, unless it's the one we are editing
  const availableConfigs = configs.filter(
    (c) =>
      !map.getSeasonId(c.id) ||
      (initialProviderId && c.id === initialProviderId)
  )

  const isEditing = !!initialProviderId

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isEditing
          ? t('titleMapping.editMapping', 'Edit Mapping')
          : t('titleMapping.addMapping', 'Add Mapping')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} pt={1}>
          <TextField
            label={t('titleMapping.originalTitle', 'Original Title')}
            value={map.key}
            disabled
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel id="provider-select-label">
              {t('common.provider', 'Provider')}
            </InputLabel>
            <Select
              labelId="provider-select-label"
              value={providerId}
              label={t('common.provider', 'Provider')}
              onChange={(e) => setProviderId(e.target.value)}
              disabled={isEditing}
            >
              {availableConfigs.map((config) => (
                <MenuItem key={config.id} value={config.id}>
                  {config.isBuiltIn
                    ? localizedDanmakuSourceType(config.impl)
                    : config.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {providerId && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">
                {t('titleMapping.selectSeason', 'Select Season')}
              </Typography>
              {seasonTitle && (
                <Typography variant="body2" color="text.secondary">
                  {t('titleMapping.selectedSeason', 'Selected: {{title}}', {
                    title: seasonTitle,
                  })}
                </Typography>
              )}
              <SeasonSearchForm
                providerConfigId={providerId}
                onSelect={(season) => {
                  setSeasonId(season.id)
                  setSeasonTitle(season.title)
                }}
              />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!providerId || !seasonId}
        >
          {t('common.save', 'Save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
