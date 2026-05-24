import { Refresh, Tune, Visibility, VisibilityOff } from '@mui/icons-material'
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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        px: 1.125,
        py: 0.875,
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
        spacing={0.75}
        sx={{ alignItems: 'center', minWidth: 0 }}
      >
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
            boxShadow: `0 0 0 2px ${color}40`,
          }}
        />
        <Typography
          variant="overline"
          sx={{
            color,
            lineHeight: 1.2,
            fontWeight: 700,
          }}
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
            <Box
              component="span"
              sx={{
                px: 0.625,
                py: 0,
                borderRadius: '3px',
                fontSize: 9,
                fontWeight: 700,
                lineHeight: '13px',
                bgcolor: 'action.hover',
                color: 'text.secondary',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              .*
            </Box>
          </Tooltip>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={t('editMode.row.refine', 'Refine (regex)')}>
          <IconButton
            size="small"
            onClick={onRefine}
            sx={{ color: refining ? color : 'text.secondary', p: 0.25 }}
          >
            <Tune sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('editMode.row.repick', 'Re-pick')}>
          <IconButton
            size="small"
            onClick={onRepick}
            sx={{ color: 'text.secondary', p: 0.25 }}
          >
            <Refresh sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('editMode.row.remove', 'Remove')}>
          <IconButton
            size="small"
            onClick={onRemove}
            sx={{ color: 'text.secondary', p: 0.25 }}
          >
            <VisibilityOff sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack
        direction="row"
        spacing={0.625}
        sx={{ alignItems: 'center', minWidth: 0 }}
      >
        <Visibility sx={{ fontSize: 11, color, flexShrink: 0 }} />
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
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
        <Box
          sx={{
            pl: 1.5,
            mt: 0.125,
            fontSize: 10.5,
            color: 'text.secondary',
            fontFamily: 'ui-monospace, monospace',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={extraction.raw ?? ''}
        >
          ↪ {extraction.raw}
        </Box>
      )}

      {isMissing && (
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.warning.main,
            fontWeight: 600,
          }}
        >
          {t('editMode.row.notOnPage', 'No longer on page')}
        </Typography>
      )}

      {extraction.regexMissed && extraction.raw && (
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.warning.main,
            fontWeight: 600,
          }}
        >
          {t('editMode.row.regexMissed', 'Regex did not match raw text')}
        </Typography>
      )}
    </Box>
  )
}
