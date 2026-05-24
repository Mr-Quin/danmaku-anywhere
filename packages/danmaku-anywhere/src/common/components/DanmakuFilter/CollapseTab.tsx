import type {
  CollapseConfig,
  DanmakuFilter,
  LabeledPattern,
} from '@danmaku-anywhere/danmaku-engine'
import { Box, Stack, Switch, TextField, Typography } from '@mui/material'
import type { Draft } from 'immer'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { SettingsBlock } from '@/common/components/SettingsBlock'
import { defaultCollapseConfig } from '@/common/options/danmakuOptions/constant'
import { LabeledSlider } from '@/content/common/DanmakuStyles/LabeledSlider'
import { PatternComposer } from './PatternComposer'
import { RuleComposer } from './RuleComposer'
import { RulesList } from './RulesList'
import { formatSeconds, parseLabeledPattern, parseRule } from './utils'

type CollapseTabProps = {
  collapse: CollapseConfig
  onChange: (updater: (draft: Draft<CollapseConfig>) => void) => void
  onEditPattern: (index: number, pattern: LabeledPattern) => void
  onEditWhiteList: (index: number, rule: DanmakuFilter) => void
}

type SettingRowProps = {
  title: string
  hint: string
  control: ReactNode
  disabled?: boolean
}

function SettingRow({ title, hint, control, disabled }: SettingRowProps) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={[
        {
          alignItems: 'center',
        },
        disabled ? { opacity: 0.6 } : false,
      ]}
    >
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {hint}
        </Typography>
      </Box>
      {control}
    </Stack>
  )
}

/** Number input that clamps on blur so the user can freely type intermediate values. */
function ClampedIntField({
  value,
  min,
  max,
  onCommit,
}: {
  value: number
  min: number
  max: number
  onCommit: (n: number) => void
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => {
    setText(String(value))
  }, [value])
  return (
    <TextField
      size="small"
      type="number"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const n = Math.max(min, Math.min(max, Number(text) || min))
        setText(String(n))
        onCommit(n)
      }}
      sx={{ width: 72, '& .MuiInputBase-root': { height: 32 } }}
      slotProps={{
        htmlInput: { min, max, step: 1 },
      }}
    />
  )
}

export function CollapseTab({
  collapse,
  onChange,
  onEditPattern,
  onEditWhiteList,
}: CollapseTabProps) {
  const { t } = useTranslation()
  const dialog = useDialog()
  const [patternError, setPatternError] = useState('')
  const [whiteListError, setWhiteListError] = useState('')

  function handleAddPattern(label: string, input: string): boolean {
    const result = parseLabeledPattern(label, input, collapse.pattern.patterns)
    if (!result.success) {
      setPatternError(result.error())
      return false
    }
    setPatternError('')
    onChange((draft) => {
      draft.pattern.patterns.push(result.value)
    })
    return true
  }

  function handleDeletePattern(index: number) {
    onChange((draft) => {
      draft.pattern.patterns.splice(index, 1)
    })
  }

  function handleResetPatterns() {
    dialog.confirm({
      title: t(
        'danmakuFilter.resetPatternsTitle',
        'Reset patterns to defaults?'
      ),
      content: t(
        'danmakuFilter.resetPatternsDescription',
        'Custom patterns will be removed.'
      ),
      onConfirm: () => {
        onChange((draft) => {
          draft.pattern.patterns = defaultCollapseConfig.pattern.patterns.map(
            (p) => ({ ...p })
          )
        })
      },
    })
  }

  function handleAddWhiteList(input: string): boolean {
    const result = parseRule(input, collapse.whiteList)
    if (!result.success) {
      setWhiteListError(result.error())
      return false
    }
    setWhiteListError('')
    onChange((draft) => {
      draft.whiteList.push({ ...result.value, enabled: true })
    })
    return true
  }

  function handleDeleteWhiteList(index: number) {
    onChange((draft) => {
      draft.whiteList.splice(index, 1)
    })
  }

  return (
    <Stack useFlexGap spacing={2}>
      <SettingsBlock
        title={t('danmakuFilter.dedupeModeTitle', 'Dedupe')}
        subtitle={t(
          'danmakuFilter.dedupeModeSubtitle',
          'Drop identical comments that appear multiple times within a time window.'
        )}
        disabled={!collapse.dedupe.enabled}
        headerRight={
          <Switch
            checked={collapse.dedupe.enabled}
            onChange={(_, checked) =>
              onChange((draft) => {
                draft.dedupe.enabled = checked
              })
            }
          />
        }
      >
        <Stack useFlexGap spacing={2}>
          <LabeledSlider
            label={t('danmakuFilter.timeWindow', 'Time window')}
            value={collapse.dedupe.windowMs}
            min={0}
            max={2000}
            step={100}
            disabled={!collapse.dedupe.enabled}
            marks={[
              { value: 0, label: '0s' },
              { value: 1000, label: '1s' },
              { value: 2000, label: '2s' },
            ]}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => formatSeconds(v as number)}
            formatChipValue={(v) => formatSeconds(v as number)}
            commitOnRelease
            onChange={(_, v) =>
              onChange((draft) => {
                draft.dedupe.windowMs = v as number
              })
            }
          />
          <SettingRow
            title={t('danmakuFilter.maxDedupe', 'Max identical')}
            hint={t(
              'danmakuFilter.maxDedupeHint',
              'Only dedupe comments that appear less than this number of times.'
            )}
            disabled={!collapse.dedupe.enabled}
            control={
              <ClampedIntField
                value={collapse.dedupe.maxDedupe}
                min={2}
                max={10}
                onCommit={(n) =>
                  onChange((draft) => {
                    draft.dedupe.maxDedupe = n
                  })
                }
              />
            }
          />
        </Stack>
      </SettingsBlock>

      <SettingsBlock
        title={t('danmakuFilter.patternModeTitle', 'Collapse')}
        subtitle={t(
          'danmakuFilter.patternModeSubtitle',
          'Collapse multiple comments into one comment.'
        )}
        disabled={!collapse.pattern.enabled}
        headerRight={
          <Switch
            checked={collapse.pattern.enabled}
            onChange={(_, checked) =>
              onChange((draft) => {
                draft.pattern.enabled = checked
              })
            }
          />
        }
      >
        <Stack useFlexGap spacing={2.5}>
          <Stack useFlexGap spacing={1}>
            <SettingRow
              disabled={!collapse.pattern.enabled}
              title={t('danmakuFilter.liveCount', 'Show combo counter')}
              hint={t(
                'danmakuFilter.liveCountHint',
                'Counter increases as repeats arrive. Turn off to show the total number of similar comments upfront.'
              )}
              control={
                <Switch
                  checked={collapse.pattern.liveCount}
                  onChange={(_, checked) =>
                    onChange((draft) => {
                      draft.pattern.liveCount = checked
                    })
                  }
                />
              }
            />
            <SettingRow
              disabled={!collapse.pattern.enabled}
              title={t('danmakuFilter.pulse', 'Pulse effect')}
              hint={t(
                'danmakuFilter.pulseHint',
                'Show a pulse animation when the counter increments.'
              )}
              control={
                <Switch
                  checked={collapse.pattern.pulse}
                  disabled={!collapse.pattern.liveCount}
                  onChange={(_, checked) =>
                    onChange((draft) => {
                      draft.pattern.pulse = checked
                    })
                  }
                />
              }
            />
            <SettingRow
              disabled={!collapse.pattern.enabled}
              title={t('danmakuFilter.autoCollapse', 'Auto-collapse')}
              hint={t(
                'danmakuFilter.autoCollapseHint',
                'Automatically collapse identical comments that appear in a row.'
              )}
              control={
                <Switch
                  checked={collapse.pattern.autoCollapse}
                  onChange={(_, checked) =>
                    onChange((draft) => {
                      draft.pattern.autoCollapse = checked
                    })
                  }
                />
              }
            />
            <SettingRow
              disabled={!collapse.pattern.enabled}
              title={t('danmakuFilter.minCount', 'Minimum copies')}
              hint={t(
                'danmakuFilter.minCountHint',
                'Only trigger collapse when at least this many comments arrive. Applies for both auto-collapse and patterns.'
              )}
              control={
                <ClampedIntField
                  value={collapse.pattern.minCount}
                  min={2}
                  max={20}
                  onCommit={(n) =>
                    onChange((draft) => {
                      draft.pattern.minCount = n
                    })
                  }
                />
              }
            />
          </Stack>

          <RulesList
            title={t('danmakuFilter.patternsHeader', 'Patterns')}
            rules={collapse.pattern.patterns}
            onDelete={handleDeletePattern}
            onEdit={(index, draft) =>
              onEditPattern(index, draft as LabeledPattern)
            }
            onResetDefaults={handleResetPatterns}
            emptyText={t('danmakuFilter.noPatterns', 'No patterns')}
            composer={
              <PatternComposer
                onAdd={handleAddPattern}
                error={patternError}
                onErrorClear={() => setPatternError('')}
              />
            }
          />
        </Stack>
      </SettingsBlock>

      <SettingsBlock
        title={t('danmakuFilter.whiteListHeader', 'White List')}
        subtitle={t(
          'danmakuFilter.whiteListHint',
          'Rules listed here will not be collapsed or deduped.'
        )}
      >
        <Stack useFlexGap spacing={1}>
          <RuleComposer
            placeholder={t(
              'danmakuFilter.enterFilterPatternPlaceholder',
              'Text or /regex/'
            )}
            onAdd={handleAddWhiteList}
            error={whiteListError}
            onErrorClear={() => setWhiteListError('')}
          />
          <RulesList
            rules={collapse.whiteList}
            onDelete={handleDeleteWhiteList}
            onEdit={onEditWhiteList}
            emptyText={t('danmakuFilter.noWhiteList', 'No White List')}
          />
        </Stack>
      </SettingsBlock>
    </Stack>
  )
}
