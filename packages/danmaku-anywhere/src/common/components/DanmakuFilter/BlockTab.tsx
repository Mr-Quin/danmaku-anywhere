import type { DanmakuFilter } from '@danmaku-anywhere/danmaku-engine'
import { Box, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InlineTester } from './InlineTester'
import { RuleComposer } from './RuleComposer'
import { RulesList } from './RulesList'
import { parseRule } from './utils'

type BlockTabProps = {
  filters: DanmakuFilter[]
  onAdd: (rule: DanmakuFilter) => void
  onEdit: (index: number, rule: DanmakuFilter) => void
  onDelete: (index: number) => void
  initialFilter?: string
}

export function BlockTab({
  filters,
  onAdd,
  onEdit,
  onDelete,
  initialFilter,
}: BlockTabProps) {
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
    <Box
      sx={{
        p: 2,
      }}
    >
      <Stack spacing={3}>
        <Typography
          variant="body1"
          sx={{
            color: 'text.secondary',
          }}
        >
          {t(
            'danmakuFilter.description',
            'Hide matching comments. They never reach the screen.'
          )}
        </Typography>

        <RuleComposer
          title={t('danmakuFilter.addFilterPattern', 'Add Filter Pattern')}
          placeholder={t(
            'danmakuFilter.enterFilterPatternPlaceholder',
            'Text or /regex/'
          )}
          error={error}
          onAdd={handleAdd}
          onErrorClear={() => setError('')}
          initialValue={initialFilter}
        />

        <RulesList
          title={t('danmakuFilter.activeFilters', 'Active Filters')}
          rules={filters}
          onDelete={onDelete}
          onEdit={onEdit}
          emptyText={t('danmakuFilter.noActiveFilters', 'No active filters')}
        />

        <InlineTester filters={filters} />
      </Stack>
    </Box>
  )
}
