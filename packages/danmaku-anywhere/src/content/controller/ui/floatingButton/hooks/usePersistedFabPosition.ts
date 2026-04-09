import { useCallback, useState } from 'react'
import { LocalStorageService } from '@/common/storage/LocalStorageService'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import type { DragOffset } from '@/content/controller/ui/components/dragOffset'

const storage = new LocalStorageService<DragOffset>('fabOffset')

function readValidOffset(defaultOffset: DragOffset): DragOffset {
  const parsed = storage.read()
  if (
    parsed &&
    typeof parsed.x === 'number' &&
    Number.isFinite(parsed.x) &&
    typeof parsed.y === 'number' &&
    Number.isFinite(parsed.y)
  ) {
    return { x: parsed.x, y: parsed.y }
  }
  return defaultOffset
}

export function usePersistedFabPosition(defaultOffset: DragOffset) {
  const [offset] = useState<DragOffset>(() => readValidOffset(defaultOffset))

  const handleDragEnd = useCallback((newOffset: DragOffset) => {
    storage.write(newOffset)
    getTrackingService().track('dragFabEnd', newOffset)
  }, [])

  return { initialOffset: offset, handleDragEnd }
}
