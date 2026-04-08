import { useCallback } from 'react'
import { useLocalStorageState } from '@/common/storage/hooks/useLocalStorageState'

export function usePersistedExpandedItems() {
  const [expandedItems, setExpandedItems] = useLocalStorageState<string[]>(
    'treeExpandedItems',
    []
  )

  const handleExpandedItemsChange = useCallback(
    (itemIds: string[]) => {
      setExpandedItems(itemIds)
    },
    [setExpandedItems]
  )

  return { expandedItems, handleExpandedItemsChange }
}
