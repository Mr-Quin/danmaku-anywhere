import type { DanmakuFilter } from '@danmaku-anywhere/danmaku-engine'
import { Stack } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SettingsBlock } from '@/common/components/SettingsBlock'
import { InlineTester } from './InlineTester'
import { RuleComposer } from './RuleComposer'
import { RulesList } from './RulesList'
import { parseRule } from './utils'

type BlockTabProps = {
  filters: DanmakuFilter[]
  onAdd: (rule: DanmakuFilter) => void
  onEdit: (index: number, rule: DanmakuFilter) => void
  onDelete: (index: number) => void
}

export function BlockTab({ filters, onAdd, onEdit, onDelete }: BlockTabProps) {
  const { t } = useTranslation()
  const [error, setError] = useState('')

  function handleAdd(input: string): boolean {
    const result = parseRule(input, filters)
    if (!result.success) {
      setError(result.error())
      return false
    }
    setError('')
    onAdd({ ...result.value, enabled: true })
    return true
  }

  return (
    <Stack useFlexGap spacing={2}>
      <SettingsBlock
        title={t('danmakuFilter.blockTab', 'Block')}
        subtitle={t(
          'danmakuFilter.description',
          'Hide matching comments. They never reach the screen.'
        )}
      >
        <Stack useFlexGap spacing={2}>
          <RuleComposer
            placeholder={t(
              'danmakuFilter.enterFilterPatternPlaceholder',
              'Text or /regex/'
            )}
            error={error}
            onAdd={handleAdd}
            onErrorClear={() => setError('')}
          />
          <RulesList
            title={t('danmakuFilter.activeFilters', 'Active Filters')}
            rules={filters}
            onDelete={onDelete}
            onEdit={onEdit}
            emptyText={t('danmakuFilter.noActiveFilters', 'No active filters')}
          />
        </Stack>
      </SettingsBlock>

      <InlineTester filters={filters} />
    </Stack>
  )
}
