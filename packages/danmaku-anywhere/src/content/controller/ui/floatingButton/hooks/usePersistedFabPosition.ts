import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DragOffset } from '@/content/controller/ui/components/dragOffset'

const STORAGE_KEY_PREFIX = 'danmaku-anywhere:fabOffset'

const readFromStorage = (defaultOffset: DragOffset): DragOffset => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX)
    if (!raw) return defaultOffset
    const parsed = JSON.parse(raw) as Partial<DragOffset>
    if (
      typeof parsed.x === 'number' &&
      Number.isFinite(parsed.x) &&
      typeof parsed.y === 'number' &&
      Number.isFinite(parsed.y)
    ) {
      return { x: parsed.x, y: parsed.y }
    }
    return defaultOffset
  } catch {
    return defaultOffset
  }
}

const writeToStorage = (offset: DragOffset) => {
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX, JSON.stringify(offset))
  } catch {
    // ignore
  }
}

export const usePersistedFabPosition = (defaultOffset: DragOffset) => {
  const [offset, setOffset] = useState<DragOffset>(() =>
    readFromStorage(defaultOffset)
  )

  useEffect(() => {
    writeToStorage(offset)
  }, [])

  const handleDragEnd = useCallback((newOffset: DragOffset) => {
    setOffset(newOffset)
    writeToStorage(newOffset)
  }, [])

  const initialOffset = useMemo<DragOffset>(() => offset, [offset])

  return { initialOffset, handleDragEnd }
}
