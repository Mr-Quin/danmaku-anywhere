import { useCallback, useState } from 'react'
import { getTrackingService } from '@/common/hooks/useSetupTracking'
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
  const [offset] = useState<DragOffset>(() => readFromStorage(defaultOffset))

  const handleDragEnd = useCallback((newOffset: DragOffset) => {
    writeToStorage(newOffset)
    getTrackingService().track('dragFabEnd', newOffset)
  }, [])

  return { initialOffset: offset, handleDragEnd }
}
