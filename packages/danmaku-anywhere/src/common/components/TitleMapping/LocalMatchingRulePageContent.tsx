import { Add, Delete } from '@mui/icons-material'
import {
  Button,
  Checkbox,
  Collapse,
  IconButton,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { MultiselectChip } from '@/common/components/MultiselectChip'
import { SelectionBottomBar } from '@/common/components/SelectionBottomBar'
import type { LocalMatchingRule } from '@/common/options/localMatchingRule/schema'
import {
  useEditLocalMatchingRules,
  useLocalMatchingRules,
} from '@/common/options/localMatchingRule/useLocalMatchingRule'
import { LocalMatchingRuleDetails } from './LocalMatchingRuleDetails'
import { LocalMatchingRuleList } from './LocalMatchingRuleList'

type LocalMatchingRulePageContentProps = {
  initialMapKey?: string
}

export const LocalMatchingRulePageContent = ({
  initialMapKey,
}: LocalMatchingRulePageContentProps) => {
  const { t } = useTranslation()
  const { rules } = useLocalMatchingRules()
  const mutations = useEditLocalMatchingRules()
  const dialog = useDialog()
  const [selectedRule, setSelectedRule] = useState<LocalMatchingRule | null>(
    null
  )
  const [isCreating, setIsCreating] = useState(initialMapKey !== undefined)
  const [createMapKey, setCreateMapKey] = useState(initialMapKey)
  const [multiselect, setMultiselect] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const activeRule = selectedRule
    ? rules.find((r) => r.mapKey === selectedRule.mapKey) || null
    : null

  useEffect(() => {
    if (selectedRule && !activeRule) {
      setSelectedRule(null)
    }
  }, [selectedRule, activeRule])

  const showDetailView = activeRule || isCreating

  const handleBack = () => {
    if (showDetailView) {
      setSelectedRule(null)
      setIsCreating(false)
      setCreateMapKey(undefined)
    }
  }

  const handleToggleMultiselect = () => {
    if (multiselect) {
      setMultiselect(false)
      setSelectedIds([])
    } else {
      setMultiselect(true)
    }
  }

  const handleCancelMultiselect = () => {
    setMultiselect(false)
    setSelectedIds([])
  }

  const allSelected = rules.length > 0 && selectedIds.length === rules.length
  const someSelected =
    selectedIds.length > 0 && selectedIds.length < rules.length

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(rules.map((r) => r.mapKey))
    }
  }

  const handleDeleteOne = (mapKey: string) => {
    dialog.delete({
      title: t('common.delete', 'Delete'),
      content: t('localMatchingRule.deleteConfirm', {
        count: 1,
        defaultValue:
          'Are you sure you want to delete {{count}} local matching rule?',
      }),
      onConfirm: async () => {
        await mutations.removeRule.mutateAsync(mapKey)
      },
    })
  }

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      return
    }

    dialog.delete({
      title: t('common.delete', 'Delete'),
      content: t('localMatchingRule.deleteConfirm', {
        count: selectedIds.length,
        defaultValue:
          'Are you sure you want to delete {{count}} local matching rules?',
      }),
      onConfirm: async () => {
        await mutations.removeRules.mutateAsync(selectedIds)
        setSelectedIds([])
        setMultiselect(false)
      },
    })
  }

  const handleSave = async (rule: LocalMatchingRule) => {
    await mutations.addRule.mutateAsync(rule)
    setSelectedRule(null)
    setIsCreating(false)
    setCreateMapKey(undefined)
  }

  const handleDelete = async (mapKey: string) => {
    await mutations.removeRule.mutateAsync(mapKey)
    setSelectedRule(null)
  }

  return (
    <>
      <TabToolbar
        title={
          isCreating
            ? t('localMatchingRule.create', 'Create Rule')
            : activeRule
              ? activeRule.mapKey
              : t('localMatchingRule.title', 'Local Matching Rules')
        }
        onGoBack={showDetailView ? handleBack : undefined}
        showBackButton={!!showDetailView}
        leftElement={
          !showDetailView ? (
            <Collapse in={multiselect} orientation="horizontal" unmountOnExit>
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={handleSelectAll}
                size="small"
                edge="start"
              />
            </Collapse>
          ) : undefined
        }
      >
        {!showDetailView && (
          <>
            <IconButton
              size="small"
              onClick={() => setIsCreating(true)}
              title={t('localMatchingRule.create', 'Create Rule')}
            >
              <Add fontSize="small" />
            </IconButton>
            {rules.length > 0 && (
              <MultiselectChip
                active={multiselect}
                onToggle={handleToggleMultiselect}
              />
            )}
          </>
        )}
      </TabToolbar>
      {showDetailView ? (
        <LocalMatchingRuleDetails
          rule={activeRule ?? undefined}
          initialMapKey={createMapKey}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ) : rules.length === 0 ? (
        <Typography variant="body1" color="text.secondary" align="center">
          {t('localMatchingRule.empty', 'No local matching rules found.')}
        </Typography>
      ) : (
        <LocalMatchingRuleList
          rules={rules}
          multiselect={multiselect}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onSelect={(rule) => setSelectedRule(rule)}
          onDelete={handleDeleteOne}
        />
      )}
      <SelectionBottomBar
        open={multiselect}
        selectionCount={selectedIds.length}
        onCancel={handleCancelMultiselect}
      >
        <Button
          variant="contained"
          color="error"
          startIcon={<Delete />}
          onClick={handleDeleteSelected}
          size="small"
          disabled={selectedIds.length === 0}
        >
          {t('common.delete', 'Delete')}
        </Button>
      </SelectionBottomBar>
    </>
  )
}
