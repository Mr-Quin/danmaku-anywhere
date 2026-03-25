import { Delete } from '@mui/icons-material'
import { IconButton, Tooltip, Typography } from '@mui/material'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DraggableList } from '@/common/components/DraggableList'
import type { LocalMatchingRule } from '@/common/options/localMatchingRule/schema'

type LocalMatchingRuleListProps = {
  rules: LocalMatchingRule[]
  multiselect?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  onSelect: (rule: LocalMatchingRule) => void
  onDelete: (mapKey: string) => void
}

interface DraggableRule {
  id: string
  original: LocalMatchingRule
}

export const LocalMatchingRuleList = ({
  rules,
  multiselect,
  selectedIds,
  onSelectionChange,
  onSelect,
  onDelete,
}: LocalMatchingRuleListProps) => {
  const { t } = useTranslation()
  const items: DraggableRule[] = useMemo(
    () => rules.map((rule) => ({ id: rule.mapKey, original: rule })),
    [rules]
  )

  return (
    <DraggableList<DraggableRule>
      items={items}
      clickable
      multiselect={multiselect}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      onEdit={(item) => onSelect(item.original)}
      disableReorder
      renderPrimary={(item) => item.original.mapKey}
      renderSecondary={(item) => (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
        >
          {item.original.pattern}
        </Typography>
      )}
      renderSecondaryAction={(item) => (
        <Tooltip title={t('common.delete', 'Delete')}>
          <IconButton edge="end" size="small" onClick={() => onDelete(item.id)}>
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    />
  )
}
