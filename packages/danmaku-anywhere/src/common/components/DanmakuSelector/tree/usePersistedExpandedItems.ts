import { useCallback, useState } from 'react'

const STORAGE_KEY = 'danmaku-anywhere:treeExpandedItems'

function readFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
      return parsed
    }
    return []
  } catch {
    return []
  }
}

function writeToStorage(items: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore quota errors
  }
}

export function usePersistedExpandedItems() {
  const [expandedItems, setExpandedItems] = useState<string[]>(readFromStorage)

  const handleExpandedItemsChange = useCallback((itemIds: string[]) => {
    setExpandedItems(itemIds)
    writeToStorage(itemIds)
  }, [])

  return { expandedItems, handleExpandedItemsChange }
}
