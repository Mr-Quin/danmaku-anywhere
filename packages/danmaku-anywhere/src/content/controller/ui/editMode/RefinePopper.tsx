import { Close } from '@mui/icons-material'
import {
  Box,
  Button,
  ClickAwayListener,
  IconButton,
  Popper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { withStopPropagation } from '@/common/utils/withStopPropagation'
import { useStore } from '@/content/controller/store/store'
import type { FieldExtraction } from './extractFieldValue'
import { type FieldId, getFieldLabel } from './fields'
import { useEditModeIntegration } from './useEditModeIntegration'

interface RefinePopperProps {
  open: boolean
  anchorEl: HTMLElement | null
  fieldId: FieldId | null
  extraction: FieldExtraction | null
  onClose: () => void
}

interface RegexEvaluation {
  parsed: string
  matched: boolean
  invalid: boolean
}

const MAX_REGEX_INPUT_LENGTH = 10_000
const MAX_PATTERN_LENGTH = 500

function evaluatePattern(raw: string, pattern: string): RegexEvaluation {
  if (pattern.length === 0) {
    return { parsed: raw, matched: false, invalid: false }
  }
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return { parsed: '', matched: false, invalid: true }
  }
  const input =
    raw.length > MAX_REGEX_INPUT_LENGTH
      ? raw.slice(0, MAX_REGEX_INPUT_LENGTH)
      : raw
  try {
    const re = new RegExp(pattern)
    const match = re.exec(input)
    if (!match) {
      return { parsed: '', matched: false, invalid: false }
    }
    return {
      parsed: match[1] ?? match[0],
      matched: true,
      invalid: false,
    }
  } catch {
    return { parsed: '', matched: false, invalid: true }
  }
}

export function RefinePopper({
  open,
  anchorEl,
  fieldId,
  extraction,
  onClose,
}: RefinePopperProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const toast = useToast.use.toast()
  const pickTarget = useStore.use.editMode().pickTarget
  const { setFieldRegex, clearFieldRegex } = useEditModeIntegration()

  const initialPattern = extraction?.regex ?? ''
  const [pattern, setPattern] = useState(initialPattern)

  useEffect(() => {
    setPattern(initialPattern)
  }, [initialPattern, fieldId])

  const color = fieldId ? theme.palette.fieldAccent[fieldId] : undefined
  const raw = extraction?.raw ?? ''

  const evaluation = useMemo(
    () => evaluatePattern(raw, pattern),
    [raw, pattern]
  )

  if (!fieldId || !extraction) {
    return null
  }

  const handleApply = async () => {
    try {
      if (pattern.trim().length === 0) {
        await clearFieldRegex(fieldId)
      } else {
        await setFieldRegex(fieldId, pattern)
      }
      onClose()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const handleReset = () => {
    setPattern(initialPattern)
  }

  return (
    <Popper
      open={open && !pickTarget}
      anchorEl={anchorEl}
      placement="left-start"
      modifiers={[
        { name: 'offset', options: { offset: [0, 12] } },
        {
          name: 'preventOverflow',
          options: { padding: 8, rootBoundary: 'viewport' },
        },
        {
          name: 'flip',
          options: {
            fallbackPlacements: ['right-start', 'top-end', 'bottom-end'],
          },
        },
      ]}
      sx={{ zIndex: 1402 }}
    >
      <ClickAwayListener onClickAway={onClose}>
        <Box
          {...withStopPropagation()}
          sx={{
            width: 360,
            p: 1.25,
            borderRadius: 1.5,
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow:
              '0 18px 40px -12px rgba(0,0,0,0.45), 0 2px 8px -2px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Stack direction="row" spacing={0.875} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 0 3px ${color}33`,
              }}
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('editMode.refine.title', 'Refine extraction · {{label}}', {
                label: getFieldLabel(t, fieldId),
              })}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton size="small" onClick={onClose} sx={{ p: 0.5 }}>
              <Close sx={{ fontSize: 14 }} />
            </IconButton>
          </Stack>

          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            {t('editMode.refine.raw', 'Raw')}
          </Typography>
          <Box
            sx={{
              px: 1.125,
              py: 0.875,
              borderRadius: 1,
              bgcolor: 'paperAlt',
              border: `1px solid ${theme.palette.divider}`,
              fontFamily: 'ui-monospace, monospace',
              fontSize: 11.5,
              wordBreak: 'break-word',
            }}
          >
            {raw || t('editMode.refine.noRaw', '(no text from element)')}
          </Box>

          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            {t('editMode.refine.pattern', 'Pattern')}
          </Typography>
          <TextField
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder={t('editMode.refine.patternPlaceholder', '(.+?) · TV')}
            error={evaluation.invalid}
            helperText={
              evaluation.invalid
                ? t('editMode.refine.invalidRegex', 'Invalid regex')
                : undefined
            }
            slotProps={{
              input: {
                sx: {
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 12,
                },
              },
            }}
            {...withStopPropagation()}
          />

          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            {t('editMode.refine.extracted', 'Extracted')}
          </Typography>
          <Box
            sx={{
              px: 1.125,
              py: 0.875,
              borderRadius: 1,
              bgcolor: evaluation.matched ? `${color}24` : 'paperAlt',
              border: `1px solid ${
                evaluation.matched ? `${color}66` : theme.palette.divider
              }`,
              fontSize: 13,
              fontWeight: 600,
              minHeight: 28,
              wordBreak: 'break-word',
            }}
          >
            {pattern.length === 0
              ? raw
              : evaluation.matched
                ? evaluation.parsed
                : t('editMode.refine.noMatch', '(no match)')}
          </Box>

          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              pt: 0.5,
              borderTop: `1px solid ${theme.palette.divider}`,
              alignItems: 'center',
            }}
          >
            <Box sx={{ flexGrow: 1 }} />
            <Button size="small" onClick={handleReset} variant="text">
              {t('common.reset', 'Reset')}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                void handleApply()
              }}
              disabled={evaluation.invalid}
            >
              {t('common.apply', 'Apply')}
            </Button>
          </Stack>
        </Box>
      </ClickAwayListener>
    </Popper>
  )
}
