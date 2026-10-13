import { Check, Refresh, Tune, VisibilityOff } from '@mui/icons-material'
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useStore } from '@/content/controller/store/store'
import type { FieldExtraction } from './extractFieldValue'
import type { FieldId } from './fields'

interface PickedFieldRowProps {
  fieldId: FieldId
  label: string
  color: string
  extraction: FieldExtraction
  refining: boolean
  onRefine: () => void
  onRepick: () => void
  onRemove: () => void
}

export function PickedFieldRow({
  fieldId,
  label,
  color,
  extraction,
  refining,
  onRefine,
  onRepick,
  onRemove,
}: PickedFieldRowProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMissing = useStore((s) => s.editMode.missingElements.has(fieldId))

  const showRaw =
    extraction.raw !== null &&
    extraction.parsed !== null &&
    extraction.raw !== extraction.parsed

  return (
    <Stack
      spacing={0.5}
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: 1,
        bgcolor: 'paperAlt',
        border: '1px solid',
        borderColor: refining ? `${color}88` : 'divider',
        boxShadow: refining ? `0 0 0 2px ${color}33` : 'none',
        minWidth: 0,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', minWidth: 0 }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
            boxShadow: `0 0 0 2px ${color}40`,
          }}
        />
        <Typography
          variant="overline"
          sx={{ color, fontWeight: 700, lineHeight: 1.2 }}
        >
          {label}
        </Typography>
        {extraction.regex && (
          <Tooltip
            title={t(
              'editMode.row.regexAppliedTooltip',
              'Regex refinement applied'
            )}
          >
            <Typography
              variant="caption"
              sx={{
                px: 0.5,
                borderRadius: 0.5,
                bgcolor: 'action.hover',
                color: 'text.secondary',
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 700,
              }}
            >
              .*
            </Typography>
          </Tooltip>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={t('editMode.row.refine', 'Refine (regex)')}>
          <IconButton
            size="small"
            onClick={onRefine}
            sx={{ color: refining ? color : 'text.secondary' }}
          >
            <Tune fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('editMode.row.repick', 'Re-pick')}>
          <IconButton size="small" onClick={onRepick}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('editMode.row.remove', 'Remove')}>
          <IconButton size="small" onClick={onRemove}>
            <VisibilityOff fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack
        direction="row"
        spacing={0.75}
        sx={{ alignItems: 'center', minWidth: 0 }}
      >
        <Check sx={{ fontSize: 14, color, flexShrink: 0 }} />
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
            flex: 1,
          }}
          title={extraction.parsed ?? ''}
        >
          {extraction.parsed ?? t('editMode.row.noText', '(no text extracted)')}
        </Typography>
      </Stack>

      {showRaw && (
        <Typography
          variant="caption"
          sx={{
            pl: 2.5,
            color: 'text.secondary',
            fontFamily: 'ui-monospace, monospace',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
          }}
          title={extraction.raw ?? ''}
        >
          ↪ {extraction.raw}
        </Typography>
      )}

      {isMissing && (
        <Typography
          variant="caption"
          sx={{ color: theme.palette.warning.main, fontWeight: 600 }}
        >
          {t('editMode.row.notOnPage', 'No longer on page')}
        </Typography>
      )}

      {extraction.regexMissed && extraction.raw && (
        <Typography
          variant="caption"
          sx={{ color: theme.palette.warning.main, fontWeight: 600 }}
        >
          {t('editMode.row.regexMissed', 'Regex did not match raw text')}
        </Typography>
      )}
    </Stack>
  )
}
