import { Delete } from '@mui/icons-material'
import { Chip, IconButton, Tooltip } from '@mui/material'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DraggableList } from '@/common/components/DraggableList'
import { ListItemPrimaryStack } from '@/common/components/ListItemPrimaryStack'
import type { SeasonMap } from '@/common/seasonMap/SeasonMap'

type TitleMappingListProps = {
  mappings: SeasonMap[]
  multiselect?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  onSelect: (map: SeasonMap) => void
  onDelete: (key: string) => void
}

interface DraggableSeasonMap {
  id: string
  original: SeasonMap
}

export const TitleMappingList = ({
  mappings,
  multiselect,
  selectedIds,
  onSelectionChange,
  onSelect,
  onDelete,
}: TitleMappingListProps) => {
  const { t } = useTranslation()
  const items: DraggableSeasonMap[] = useMemo(
    () => mappings.map((map) => ({ id: map.key, original: map })),
    [mappings]
  )

  return (
    <DraggableList<DraggableSeasonMap>
      items={items}
      clickable
      multiselect={multiselect}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      onEdit={(item) => onSelect(item.original)}
      disableReorder
      renderPrimary={(item) => (
        <ListItemPrimaryStack text={item.original.key}>
          <Chip label={item.original.seasonIds.length} size="small" />
        </ListItemPrimaryStack>
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
