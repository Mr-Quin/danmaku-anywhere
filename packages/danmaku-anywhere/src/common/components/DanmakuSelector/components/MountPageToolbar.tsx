import type { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { CheckBox, CheckBoxOutlined } from '@mui/icons-material'
import {
  Button,
  Checkbox,
  Chip,
  Collapse,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { FilterButton } from '@/common/components/FilterButton'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import { TypeSelector } from '@/common/components/TypeSelector'
import type { DAMenuItemConfig } from '../../Menu/DAMenuItemConfig'

interface MountPageToolbarProps {
  filter: string
  onFilterChange: (filter: string) => void
  isFilterOpen: boolean
  setIsFilterOpen: (isFilterOpen: boolean) => void
  selectedTypes: string[]
  onSelectedTypesChange: (types: DanmakuSourceType[]) => void
  multiselect: boolean
  onToggleMultiselect: () => void
  onUnmount?: () => void
  isMounted: boolean
  menuItems: DAMenuItemConfig[]
  onSelectAll: () => void
  clearSelection: () => void
  selectionCount: number
}

export const MountPageToolbar = ({
  filter,
  onFilterChange,
  isFilterOpen,
  setIsFilterOpen,
  selectedTypes,
  onSelectedTypesChange,
  multiselect,
  onToggleMultiselect,
  onUnmount,
  isMounted,
  menuItems,
  onSelectAll,
  clearSelection,
  selectionCount,
}: MountPageToolbarProps) => {
  const { t } = useTranslation()

  function handleSelection() {
    if (selectionCount > 0) {
      clearSelection()
    } else {
      onSelectAll()
    }
  }
  return (
    <TabToolbar
      title={t('mountPage.pageTitle', 'Danmaku Library')}
      leftElement={
        <Collapse in={multiselect} orientation="horizontal" unmountOnExit>
          <Checkbox
            checked={selectionCount > 0}
            onChange={handleSelection}
            size="small"
            edge="start"
          />
        </Collapse>
      }
    >
      <FilterButton
        filter={filter}
        onChange={onFilterChange}
        open={isFilterOpen}
        onOpen={() => setIsFilterOpen(true)}
        onClose={() => setIsFilterOpen(false)}
      />
      <TypeSelector
        selectedTypes={selectedTypes as DanmakuSourceType[]}
        setSelectedType={(types) => onSelectedTypesChange(types)}
      />
      <Chip
        variant="outlined"
        label={
          <Stack direction="row" alignItems="center" gap={0.5}>
            {multiselect ? (
              <CheckBox fontSize="small" />
            ) : (
              <CheckBoxOutlined fontSize="small" />
            )}
            <Typography variant="body2" fontSize="small">
              {t('common.multiselect', 'Multiselect')}
            </Typography>
          </Stack>
        }
        onClick={onToggleMultiselect}
        color="primary"
      />

      {onUnmount && (
        <Collapse in={isMounted} unmountOnExit orientation="horizontal">
          <Button
            variant="outlined"
            onClick={onUnmount}
            color="warning"
            disabled={!isMounted}
            sx={{ whiteSpace: 'nowrap', ml: 1 }}
          >
            {t('danmaku.unmount', 'Unmount')}
          </Button>
        </Collapse>
      )}
      <DrilldownMenu
        items={menuItems}
        dense
        ButtonProps={{ size: 'small', edge: 'end' }}
      />
    </TabToolbar>
  )
}
