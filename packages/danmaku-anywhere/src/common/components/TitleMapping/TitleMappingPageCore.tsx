import { Delete } from '@mui/icons-material'
import { Button, Checkbox, Collapse, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { MultiselectChip } from '@/common/components/MultiselectChip'
import { SelectionBottomBar } from '@/common/components/SelectionBottomBar'
import {
  useAllSeasonMap,
  useSeasonMapMutations,
} from '@/common/seasonMap/queries/useAllSeasonMap'
import type { SeasonMap } from '@/common/seasonMap/SeasonMap'
import { TitleMappingDetails } from './TitleMappingDetails'
import { TitleMappingList } from './TitleMappingList'

type TitleMappingPageCoreProps = {
  onGoBack?: () => void
  showBackButton?: boolean
}

export const TitleMappingPageCore = ({
  onGoBack,
  showBackButton,
}: TitleMappingPageCoreProps) => {
  const { t } = useTranslation()
  const { data: mappings } = useAllSeasonMap()
  const mutations = useSeasonMapMutations()
  const dialog = useDialog()
  const [selectedMapping, setSelectedMapping] = useState<SeasonMap | null>(null)
  const [multiselect, setMultiselect] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const handleBack = () => {
    if (selectedMapping) {
      setSelectedMapping(null)
    } else {
      onGoBack?.()
    }
  }

  const activeMapping = selectedMapping
    ? mappings.find((m) => m.key === selectedMapping.key) || null
    : null

  useEffect(() => {
    if (selectedMapping && !activeMapping) {
      setSelectedMapping(null)
    }
  }, [selectedMapping, activeMapping])

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

  const allSelected =
    mappings.length > 0 && selectedIds.length === mappings.length
  const someSelected =
    selectedIds.length > 0 && selectedIds.length < mappings.length

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(mappings.map((m) => m.key))
    }
  }

  const handleDeleteOne = (key: string) => {
    dialog.delete({
      title: t('common.delete', 'Delete'),
      content: t(
        'titleMapping.deleteConfirmOne',
        'Are you sure you want to delete this title mapping?'
      ),
      onConfirm: async () => {
        await mutations.delete.mutateAsync(key)
      },
    })
  }

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      return
    }

    dialog.delete({
      title: t('common.delete', 'Delete'),
      content: t(
        'titleMapping.deleteConfirm',
        'Are you sure you want to delete {{count}} title mapping(s)?',
        { count: selectedIds.length }
      ),
      onConfirm: async () => {
        await mutations.deleteMany.mutateAsync(selectedIds)
        setSelectedIds([])
        setMultiselect(false)
      },
    })
  }

  const showListView = !activeMapping

  return (
    <TabLayout>
      <TabToolbar
        title={
          activeMapping
            ? activeMapping.key
            : t('titleMapping.title', 'Title Mappings')
        }
        onGoBack={handleBack}
        showBackButton={showBackButton || !!activeMapping}
        leftElement={
          showListView ? (
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
        {showListView && mappings.length > 0 && (
          <MultiselectChip
            active={multiselect}
            onToggle={handleToggleMultiselect}
          />
        )}
      </TabToolbar>
      {activeMapping ? (
        <TitleMappingDetails map={activeMapping} />
      ) : mappings.length === 0 ? (
        <Typography variant="body1" color="text.secondary" align="center">
          {t('titleMapping.empty', 'No title mappings found.')}
        </Typography>
      ) : (
        <TitleMappingList
          mappings={mappings}
          multiselect={multiselect}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onSelect={(map) => setSelectedMapping(map)}
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
    </TabLayout>
  )
}
