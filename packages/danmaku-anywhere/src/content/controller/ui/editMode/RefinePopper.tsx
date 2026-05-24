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
import { withStopPropagation } from '@/common/utils/withStopPropagation'
import { useStore } from '@/content/controller/store/store'
import type { FieldExtraction } from './extractFieldValue'
import { type FieldId, getFieldLabel } from './fields'
import { useEditModeDraft } from './useEditModeIntegration'

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
  const pickTarget = useStore.use.editMode().pickTarget
  const { setFieldRegex, clearFieldRegex } = useEditModeDraft()

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

  const handleApply = () => {
    if (pattern.length === 0) {
      clearFieldRegex(fieldId)
    } else {
      setFieldRegex(fieldId, pattern)
    }
    onClose()
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
      sx={{ zIndex: 2147483643 }}
    >
      <ClickAwayListener onClickAway={onClose}>
        <Stack
          {...withStopPropagation()}
          spacing={1.25}
          sx={{
            width: 360,
            p: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow:
              '0 18px 40px -12px rgba(0,0,0,0.45), 0 2px 8px -2px rgba(0,0,0,0.3)',
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 10,
                height: 10,
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
            <IconButton size="small" onClick={onClose}>
              <Close fontSize="small" />
            </IconButton>
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              {t('editMode.refine.raw', 'Raw')}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                px: 1.25,
                py: 1,
                borderRadius: 1,
                bgcolor: 'paperAlt',
                border: `1px solid ${theme.palette.divider}`,
                fontFamily: 'ui-monospace, monospace',
                wordBreak: 'break-word',
              }}
            >
              {raw || t('editMode.refine.noRaw', '(no text from element)')}
            </Typography>
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              {t('editMode.refine.pattern', 'Pattern')}
            </Typography>
            <TextField
              autoFocus
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !evaluation.invalid) {
                  e.preventDefault()
                  handleApply()
                }
              }}
              placeholder={t(
                'editMode.refine.patternPlaceholder',
                '(.+?) · TV'
              )}
              error={evaluation.invalid}
              helperText={
                evaluation.invalid
                  ? t('editMode.refine.invalidRegex', 'Invalid regex')
                  : undefined
              }
              slotProps={{
                input: {
                  sx: { fontFamily: 'ui-monospace, monospace' },
                },
              }}
              {...withStopPropagation()}
            />
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              {t('editMode.refine.extracted', 'Extracted')}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                px: 1.25,
                py: 1,
                borderRadius: 1,
                bgcolor: evaluation.matched ? `${color}24` : 'paperAlt',
                border: `1px solid ${
                  evaluation.matched ? `${color}66` : theme.palette.divider
                }`,
                fontWeight: 600,
                minHeight: 32,
                wordBreak: 'break-word',
              }}
            >
              {pattern.length === 0
                ? raw
                : evaluation.matched
                  ? evaluation.parsed
                  : t('editMode.refine.noMatch', '(no match)')}
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            sx={{
              pt: 1,
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
              onClick={handleApply}
              disabled={evaluation.invalid}
            >
              {t('common.apply', 'Apply')}
            </Button>
          </Stack>
        </Stack>
      </ClickAwayListener>
    </Popper>
  )
}
