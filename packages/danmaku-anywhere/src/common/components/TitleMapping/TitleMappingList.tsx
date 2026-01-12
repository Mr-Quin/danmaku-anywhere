import { Chip } from '@mui/material'
import { useMemo } from 'react'
import { DraggableList } from '@/common/components/DraggableList'
import { ListItemPrimaryStack } from '@/common/components/ListItemPrimaryStack'
import type { SeasonMap } from '@/common/seasonMap/SeasonMap'

type TitleMappingListProps = {
  mappings: SeasonMap[]
  onSelect: (map: SeasonMap) => void
}

interface DraggableSeasonMap {
  id: string
  original: SeasonMap
}

export const TitleMappingList = ({
  mappings,
  onSelect,
}: TitleMappingListProps) => {
  const items: DraggableSeasonMap[] = useMemo(
    () => mappings.map((map) => ({ id: map.key, original: map })),
    [mappings]
  )

  return (
    <DraggableList<DraggableSeasonMap>
      items={items}
      clickable
      onEdit={(item) => onSelect(item.original)}
      disableReorder
      renderPrimary={(item) => (
        <ListItemPrimaryStack text={item.original.key}>
          <Chip label={item.original.seasonIds.length} size="small" />
        </ListItemPrimaryStack>
      )}
      renderSecondaryAction={() => null}
    />
  )
}
