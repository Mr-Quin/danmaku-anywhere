import type {
  DanmakuFilter,
  LabeledPattern,
} from '@danmaku-anywhere/danmaku-engine'
import { Check, Close, Edit } from '@mui/icons-material'
import {
  alpha,
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FilterTextField } from './FilterTextField'
import { parseLabeledPattern, parseRule, ruleDisplay } from './utils'

type DisplayRule = DanmakuFilter | LabeledPattern

function hasLabel(r: DisplayRule): r is LabeledPattern {
  return 'label' in r
}

type RulesListProps = {
  title?: string
  rules: DisplayRule[]
  onDelete: (index: number) => void
  onEdit?: (index: number, rule: DisplayRule) => void
  onResetDefaults?: () => void
  emptyText: string
  /** Rendered between the title row and the rules paper (e.g. an Add composer). */
  composer?: ReactNode
}

export function RulesList({
  title,
  rules,
  onDelete,
  onEdit,
  onResetDefaults,
  emptyText,
  composer,
}: RulesListProps) {
  const { t } = useTranslation()
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  return (
    <Box>
      {(title || onResetDefaults) && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            mb: 0.5,
          }}
        >
          {title && (
            <>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                }}
              >
                {title}
              </Typography>
              <Chip
                label={rules.length}
                size="small"
                variant="outlined"
                sx={{ height: 20 }}
              />
            </>
          )}
          <Box
            sx={{
              flex: 1,
            }}
          />
          {onResetDefaults && (
            <Button
              variant="text"
              size="small"
              color="inherit"
              onClick={onResetDefaults}
              sx={{
                color: 'text.secondary',
                textTransform: 'none',
                minWidth: 0,
                px: 1,
                py: 0,
              }}
            >
              {t('danmakuFilter.resetPatternsButton', 'Reset defaults')}
            </Button>
          )}
        </Stack>
      )}
      {composer && (
        <Box
          sx={{
            mb: 1,
          }}
        >
          {composer}
        </Box>
      )}
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <List dense disablePadding>
          {rules.map((rule, i) => (
            <Box key={`${rule.type}-${rule.value}-${i}`}>
              {editingIndex === i && onEdit ? (
                <EditRow
                  rule={rule}
                  existing={rules.filter((_, j) => j !== i)}
                  onCancel={() => setEditingIndex(null)}
                  onSave={(updated) => {
                    onEdit(i, updated)
                    setEditingIndex(null)
                  }}
                />
              ) : (
                <DisplayRow
                  rule={rule}
                  canEdit={!!onEdit}
                  onEdit={() => setEditingIndex(i)}
                  onDelete={() => onDelete(i)}
                />
              )}
            </Box>
          ))}
          {rules.length === 0 && (
            <ListItem>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontStyle: 'italic',
                }}
              >
                {emptyText}
              </Typography>
            </ListItem>
          )}
        </List>
      </Paper>
    </Box>
  )
}

type DisplayRowProps = {
  rule: DisplayRule
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}

const ROW_SX = {
  py: 0.5,
  bgcolor: 'background.default',
} as const

function DisplayRow({ rule, canEdit, onEdit, onDelete }: DisplayRowProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const display = ruleDisplay(rule)
  const label = hasLabel(rule) ? rule.label : null

  return (
    <ListItem sx={ROW_SX}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          width: '100%',
          minWidth: 0,
        }}
      >
        <Typography
          variant="body2"
          component="span"
          noWrap
          title={display}
          sx={{
            fontFamily: 'monospace',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {display}
        </Typography>
        {label && (
          <Chip
            label={label}
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.secondary.main, 0.1),
              color: theme.palette.secondary.main,
              fontWeight: 'bold',
              height: 20,
              fontSize: theme.typography.caption.fontSize,
              borderRadius: 1,
            }}
          />
        )}
        <Chip
          label={
            rule.type === 'regex'
              ? t('common.regexShort', 'Regex')
              : t('common.textShort', 'Text')
          }
          size="small"
          variant="outlined"
          sx={{ height: 20, fontSize: theme.typography.caption.fontSize }}
        />
        {canEdit && (
          <IconButton size="small" onClick={onEdit} sx={{ ml: 0.5 }}>
            <Edit fontSize="small" />
          </IconButton>
        )}
        <IconButton size="small" onClick={onDelete}>
          <Close fontSize="small" />
        </IconButton>
      </Stack>
    </ListItem>
  )
}

type EditRowProps = {
  rule: DisplayRule
  existing: DisplayRule[]
  onCancel: () => void
  onSave: (updated: DisplayRule) => void
}

function EditRow({ rule, existing, onCancel, onSave }: EditRowProps) {
  const { t } = useTranslation()
  const isPattern = hasLabel(rule)
  const [label, setLabel] = useState(isPattern ? rule.label : '')
  const [value, setValue] = useState(ruleDisplay(rule))
  const [error, setError] = useState('')

  function handleSave() {
    if (isPattern) {
      const result = parseLabeledPattern(
        label,
        value,
        existing.filter(hasLabel)
      )
      if (!result.success) {
        setError(result.error())
        return
      }
      onSave({ ...result.value, enabled: rule.enabled })
      return
    }
    const result = parseRule(value, existing)
    if (!result.success) {
      setError(result.error())
      return
    }
    onSave({ ...result.value, enabled: rule.enabled })
  }

  return (
    <ListItem sx={ROW_SX}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          width: '100%',
        }}
      >
        <FilterTextField
          fullWidth
          value={value}
          error={!!error}
          helperText={error || undefined}
          slotProps={{
            formHelperText: {
              sx: (theme) => ({
                position: 'absolute',
                top: '100%',
                left: 0,
                mt: 0.25,
                fontSize: theme.typography.overline.fontSize,
              }),
            },
          }}
          sx={{ position: 'relative' }}
          onChange={(e) => {
            setError('')
            setValue(e.target.value)
          }}
        />
        {isPattern && (
          <FilterTextField
            value={label}
            placeholder={t('danmakuFilter.labelPlaceholder', 'Label')}
            onChange={(e) => {
              setError('')
              setLabel(e.target.value)
            }}
            sx={{ width: 96 }}
          />
        )}
        <IconButton
          size="small"
          color="primary"
          onClick={handleSave}
          sx={{ height: 32, width: 32 }}
        >
          <Check fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={onCancel}
          sx={{ height: 32, width: 32 }}
        >
          <Close fontSize="small" />
        </IconButton>
      </Stack>
    </ListItem>
  )
}
