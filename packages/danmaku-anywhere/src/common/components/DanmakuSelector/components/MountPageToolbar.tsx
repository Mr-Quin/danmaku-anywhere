import type { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { CheckBox, CheckBoxOutlined } from '@mui/icons-material'
import { Button, Chip, Collapse, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  DrilldownMenu,
  type DrilldownMenuItemProps,
} from '@/common/components/DrilldownMenu'
import { FilterButton } from '@/common/components/FilterButton'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { TypeSelector } from '@/common/components/TypeSelector'

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
  isMounted?: boolean
  menuItem: DrilldownMenuItemProps
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
  menuItem,
}: MountPageToolbarProps) => {
  const { t } = useTranslation()
  return (
    <TabToolbar title={t('mountPage.pageTitle', 'Danmaku Library')}>
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
      <DrilldownMenu items={[menuItem]} dense ButtonProps={{ size: 'small' }} />
    </TabToolbar>
  )
}
