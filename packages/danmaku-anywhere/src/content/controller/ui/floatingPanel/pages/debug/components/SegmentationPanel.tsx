import { Alert, Box, FormControlLabel, Stack, Switch } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { SegmentationStats } from '@/common/rpcClient/background/types'
import { BoolChip, FieldRow, FieldTable, SectionHeader } from './DebugShared'

export interface SegmentationDebugData extends SegmentationStats {
  onToggleDebugOverlay: (enabled: boolean) => void
}

export const SegmentationPanel = ({
  running,
  model,
  fps,
  lastError,
  debugOverlay,
  onToggleDebugOverlay,
}: SegmentationDebugData) => {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        p: 1,
      }}
    >
      <SectionHeader>
        {t('debugPage.segmentation.status', 'Status')}
      </SectionHeader>
      <FieldTable>
        <FieldRow
          label={t('debugPage.segmentation.running', 'Running')}
          value={
            <BoolChip
              label={
                running
                  ? t('debugPage.segmentation.active', 'Active')
                  : t('debugPage.segmentation.idle', 'Idle')
              }
              value={running}
            />
          }
        />
        <FieldRow
          label={t('debugPage.segmentation.model', 'Model')}
          value={model ?? '-'}
        />
        <FieldRow
          label={t('debugPage.segmentation.fps', 'FPS')}
          value={fps === null ? '-' : fps.toFixed(1)}
        />
      </FieldTable>

      {lastError !== null && (
        <Alert
          severity="error"
          sx={{ mt: 1, fontSize: 11, alignItems: 'center' }}
        >
          {lastError}
        </Alert>
      )}

      <SectionHeader>
        {t('debugPage.segmentation.controls', 'Controls')}
      </SectionHeader>
      <Stack sx={{ px: 1 }}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={debugOverlay}
              onChange={(e) => onToggleDebugOverlay(e.target.checked)}
            />
          }
          label={t('debugPage.segmentation.debugOverlay', 'Debug overlay')}
          sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }}
        />
      </Stack>
    </Box>
  )
}
